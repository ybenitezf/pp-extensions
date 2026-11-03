#!/usr/bin/perl
#
# pty-helper.pl - give a child shell a real pseudo-terminal of an explicit size.
#
# Usage:
#   perl pty-helper.pl [command [argument ...]] < input > output 3< control
#
# With no argument the child is `bash -i`. With arguments the child is that
# command. The command form exists only to make a test deterministic.
#
# The helper opens /dev/ptmx itself and sets the window size with TIOCSWINSZ before
# it starts the shell. A fresh pseudo-terminal has the size 0 0, and `tput` then
# falls back to the terminfo default of 80 columns. That is why /usr/bin/script is
# not enough on its own: a resize with `script` needs an `stty` command inside the
# output stream, and the caller must not see a command line on the screen.
#
# File descriptors:
#   0  input bytes for the shell. The helper writes them to the pty unchanged.
#   1  output bytes from the shell, unchanged. No line is added, no byte is changed.
#   2  the helper's own errors only, never shell output.
#   3  optional control channel for resize frames, read only. When fd 3 is not open,
#      the helper runs without resize support.
#
# Resize frame format on fd 3, exactly 4 bytes per frame, no header, no terminator:
#   4 bytes, pack("S2", $cols, $rows)
#   byte 0-1  columns, native unsigned short, low byte first on x86-64
#   byte 2-3  rows,    native unsigned short, low byte first on x86-64
# A frame of 132 columns and 43 rows is therefore the 4 bytes  84 00 2b 00.
# The helper keeps a partial frame until the rest of its 4 bytes arrives, so a
# caller may write frames at any byte boundary.
#
# The helper relays bytes with sysread and syswrite only, so nothing in the shell
# output is translated: ESC, SGR colour, and 8-bit bytes arrive as they were sent.
#
# When the shell exits, the helper exits with the status of the shell (128 + the
# signal number when a signal killed it).
#
# Core Perl only: POSIX, Fcntl, IO::Handle, Errno. No cpan, no module that needs
# building, and no external command such as stty.
#
use strict;
use warnings;

use POSIX ();
use Fcntl qw(O_RDWR O_NOCTTY);
use IO::Handle;
use Errno qw(EIO EINTR);

# ioctl request numbers from <asm-generic/ioctl.h> and <asm/ioctls.h> on x86-64.
use constant TIOCSPTLCK => 0x40045431;    # set: 0 unlocks the slave side
use constant TIOCGPTN   => 0x80045430;    # get: the slave number N of /dev/pts/N
use constant TIOCSWINSZ => 0x5414;        # set: struct winsize
use constant TIOCGWINSZ => 0x5413;        # get: struct winsize
use constant TIOCSCTTY  => 0x540E;        # set: the controlling terminal

# The fixed start size and terminal type of the child.
use constant INIT_COLS => 100;
use constant INIT_ROWS => 30;
use constant CHILD_TERM => 'xterm-256color';

use constant FRAME_BYTES => 4;            # pack("S2", $cols, $rows)

# The resize channel arrives on descriptor 3. Save a private copy of it now,
# before /dev/ptmx or any other open can take the number 3: a later dup of
# "descriptor 3" would duplicate the master and read the shell output as resize
# frames. With no descriptor 3 the helper has no resize channel.
my $ctl;
open($ctl, '<&=', 3) or undef $ctl;
$ctl->autoflush(1) if $ctl && $ctl->can('autoflush');

my $child_pid;

sub fail {
    my ($what) = @_;
    print STDERR "pty-helper: $what\n";
    exit 1;
}

# struct winsize { unsigned short ws_row, ws_col, ws_xpixel, ws_ypixel; }
sub set_winsize {
    my ($fh, $cols, $rows) = @_;
    my $ws = pack("S4", $rows, $cols, 0, 0);
    return ioctl($fh, TIOCSWINSZ, $ws);
}

sub get_winsize {
    my ($fh) = @_;
    my $ws = pack("S4", 0, 0, 0, 0);
    return () unless ioctl($fh, TIOCGWINSZ, $ws);
    my ($rows, $cols) = unpack("S4", $ws);
    return ($cols, $rows);
}

# ---- the fixed size and the command ------------------------------------------
# The start size is fixed at 100 columns and 30 rows. A fresh pty has the size
# 0 0, and `tput` then falls back to the terminfo default of 80 columns.
my $init_cols = INIT_COLS;
my $init_rows = INIT_ROWS;

# With no argument the child is an interactive bash. With arguments the child is
# that command, which lets a test name 1 command and get a fixed result.
my @child_argv = @ARGV ? @ARGV : ('bash', '-i');

# ---- open the master, unlock the slave, learn its number ---------------------
sysopen(my $ptmx, "/dev/ptmx", O_RDWR | O_NOCTTY)
    or fail("cannot open /dev/ptmx: $!");

my $unlock = pack("i", 0);
ioctl($ptmx, TIOCSPTLCK, $unlock)
    or fail("TIOCSPTLCK failed: $!");

my $ptn = pack("i", -1);
ioctl($ptmx, TIOCGPTN, $ptn)
    or fail("TIOCGPTN failed: $!");
my $slave_no = unpack("i", $ptn);
fail("TIOCGPTN gave no slave number") if $slave_no < 0;
my $slave_path = "/dev/pts/$slave_no";

sysopen(my $slave, $slave_path, O_RDWR | O_NOCTTY)
    or fail("cannot open $slave_path: $!");

# The size goes to the pty before the shell starts, so the shell never sees 0 0.
set_winsize($slave, $init_cols, $init_rows)
    or fail("TIOCSWINSZ on $slave_path failed: $!");

# ---- start the child --------------------------------------------------------
# The parent must not close its copy of the slave before the child holds the slave
# open. On Linux a read on the master with no slave open returns EIO at once, and
# the relay loop would then stop before the shell writes its prompt. So the child
# opens the slave, puts it on 0, 1, and 2, and only then writes 1 byte to this
# pipe. The parent waits for that byte and closes its copy of the slave after it.
pipe(my $ready_r, my $ready_w) or fail("pipe failed: $!");

$child_pid = fork();
fail("fork failed: $!") unless defined $child_pid;

if ($child_pid == 0) {
    close($ready_r);

    # Child: a new session, then the slave as the controlling terminal on 0, 1, 2.
    POSIX::setsid();
    close($ptmx);
    close($slave);
    close($ctl) if $ctl;

    # Open the slave again without O_NOCTTY: after setsid() the first terminal
    # that this process opens becomes its controlling terminal, and it becomes
    # the foreground process group of that terminal.
    my $tty;
    open($tty, '+<', $slave_path) or POSIX::_exit(1);
    my $tty_fd = fileno($tty);
    for my $fd (0, 1, 2) {
        # dup2 returns the new descriptor, so 0 is a success and not a failure.
        my $got = POSIX::dup2($tty_fd, $fd);
        POSIX::_exit(1) unless defined $got && $got >= 0;
    }
    # The open above normally makes the terminal the controlling terminal. Ask
    # for it once more and ignore the error when it is already in place. The call
    # needs the open handle: ioctl() does not accept a bare descriptor number.
    my $ctty = pack("i", 0);
    ioctl($tty, TIOCSCTTY, $ctty);

    POSIX::close($tty_fd) if $tty_fd > 2;

    $ENV{TERM} = CHILD_TERM;
    delete $ENV{COLUMNS};
    delete $ENV{LINES};
    # The terminfo of this container is at /lib/terminfo; /usr/share/terminfo is
    # absent. Name the directory that exists, so ncurses finds xterm-256color.
    $ENV{TERMINFO} = '/lib/terminfo';
    $ENV{TERMINFO_DIRS} = '/lib/terminfo';

    syswrite($ready_w, "1");
    close($ready_w);

    exec { $child_argv[0] } @child_argv or POSIX::_exit(127);
}

# ---- parent -----------------------------------------------------------------
# Wait until the child holds the slave, then keep the parent's own copy of it
# open. While a slave descriptor is open, a read on the master never fails with
# EIO, so the bytes that the child wrote just before it exited stay readable.
# The parent drains the master after the child is reaped, and then it exits.
close($ready_w);
my $ready = '';
my $ready_n = sysread($ready_r, $ready, 1);
close($ready_r);

if (!defined $ready_n || $ready_n != 1) {
    my $st = 0;
    waitpid($child_pid, 0);
    $st = $?;
    print STDERR "pty-helper: the child did not start\n";
    exit(($st & 127) ? 128 + ($st & 127) : ($st >> 8));
}

# Forward a stop signal to the shell, which is a session leader: -pid is its group.
for my $sig (qw(TERM INT HUP)) {
    $SIG{$sig} = sub {
        kill($sig, -$child_pid) if $child_pid;
        $SIG{$sig} = 'DEFAULT';
        kill($sig, $$);
    };
}

# fd 3 was saved above, before any other descriptor could take its number.

binmode($ptmx);
binmode(STDOUT);
binmode(STDIN);

my $status   = 0;
my $child_status;       # the wait status of the child, once it is reaped
my $frame    = '';      # a partial resize frame, 0 to 3 bytes
my $open_in  = 1;
my $open_ctl = $ctl ? 1 : 0;

sub write_all {
    my ($fh, $buf, $len) = @_;
    my $off = 0;
    while ($off < $len) {
        my $n = syswrite($fh, $buf, $len - $off, $off);
        if (!defined $n) {
            next if $! == EINTR;
            return 0;           # EPIPE and other write errors: give up quietly
        }
        last if $n == 0;
        $off += $n;
    }
    return 1;
}

sub apply_frames {
    my ($buf) = @_;
    my $n = 0;
    while ($n + FRAME_BYTES <= length($buf)) {
        my ($cols, $rows) = unpack("S2", substr($buf, $n, FRAME_BYTES));
        $n += FRAME_BYTES;
        next if $cols < 1 || $rows < 1;
        set_winsize($ptmx, $cols, $rows);
    }
    return substr($buf, $n);
}

RELAY: while (1) {
    my ($rin, $maxfd) = ('', -1);
    for my $fh ($ptmx, $open_in ? \*STDIN : (), $open_ctl ? $ctl : ()) {
        my $fd = fileno($fh);
        next unless defined $fd;
        vec($rin, $fd, 1) = 1;
        $maxfd = $fd if $fd > $maxfd;
    }
    last unless $maxfd >= 0;

    # The timeout lets the loop notice that the child has exited even when no
    # byte arrives on any descriptor.
    my $nfound = select(my $rout = $rin, undef, undef, 0.25);
    if ($nfound < 0) {
        next if $! == EINTR;
        last;
    }

    # Shell output to the caller's standard output, byte for byte.
    if (vec($rout, fileno($ptmx), 1)) {
        my $buf = '';
        my $n = sysread($ptmx, $buf, 65536);
        if (!defined $n) {
            next if $! == EINTR;
            last RELAY if $! == EIO;
            last RELAY;
        }
        last RELAY if $n == 0;
        last RELAY unless write_all(\*STDOUT, $buf, $n);
    }

    # Caller input to the shell, byte for byte.
    if ($open_in && vec($rout, fileno(STDIN), 1)) {
        my $buf = '';
        my $n = sysread(STDIN, $buf, 65536);
        if (!defined $n) {
            next if $! == EINTR;
            $open_in = 0;
        }
        elsif ($n == 0) {
            $open_in = 0;       # the caller closed its end; the shell keeps going
        }
        else {
            last RELAY unless write_all($ptmx, $buf, $n);
        }
    }

    # Resize frames from fd 3, applied with TIOCSWINSZ.
    if ($open_ctl && vec($rout, fileno($ctl), 1)) {
        my $buf = '';
        my $n = sysread($ctl, $buf, 4096);
        if (!defined $n) {
            next if $! == EINTR;
            $open_ctl = 0;
            $frame = '';
        }
        elsif ($n == 0) {
            $open_ctl = 0;
            $frame = '';
        }
        else {
            $frame = apply_frames($frame . $buf);
        }
    }

    # The child is a session leader. When it is reaped the shell has stopped, so
    # drain the last bytes and stop the relay.
    my $gone = waitpid($child_pid, POSIX::WNOHANG());
    if (defined $gone && $gone == $child_pid) {
        $child_status = $?;
        last RELAY;
    }
}

# ---- drain the last bytes ---------------------------------------------------
# The child writes its last bytes and then exits. The parent still holds a slave
# descriptor, so the master keeps those bytes. Read them until the pty is quiet.
my $quiet = 0;
while ($quiet < 5) {
    my $rin = '';
    vec($rin, fileno($ptmx), 1) = 1;
    my $nfound = select(my $rout = $rin, undef, undef, 0.1);
    if ($nfound < 0) {
        next if $! == EINTR;
        last;
    }
    if ($nfound == 0) {
        $quiet++;
        next;
    }
    my $buf = '';
    my $n = sysread($ptmx, $buf, 65536);
    last if !defined $n;
    last if $n == 0;
    last unless write_all(\*STDOUT, $buf, $n);
    $quiet = 0;
}
close($slave);

# The shell stopped writing. Take its exit status and pass it on.
my $exit = 0;
if ($child_pid) {
    my $st = $child_status;
    if (!defined $st && waitpid($child_pid, 0) == $child_pid) {
        $st = $?;
    }
    if (defined $st) {
        $exit = ($st & 127) ? 128 + ($st & 127) : ($st >> 8);
    }
}
exit $exit;
