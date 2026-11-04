// The composer chip follows this conversation's durable orchestrator-mode state.
export default function setup(pocket) {
    pocket.style("look.css");
    let chip = null;
    let modeOn = null;
    let busy = false;
    let requestVersion = 0;

    function render() {
        if (chip === null) return;

        const modeLabel = modeOn === true ? "On" : "Off";
        const updating = busy ? " (updating…)" : "";

        chip.update({
            title: `Orchestrator mode: ${modeLabel}${updating}`,
        });
    }

    function addChip() {
        if (chip !== null) return;

        chip = pocket.composerButton({
            id: "orchestrator-mode",
            title: "Orchestrator mode: Off",
            icon: "shield",
            run: () => toggle(),
        });
    }

    function removeChip() {
        if (chip === null) return;

        chip.remove();
        chip = null;
    }

    function isSession(value) {
        return value !== null && typeof value === "object" && value.session === true;
    }

    function isOn(value) {
        return value !== null && typeof value === "object" && value.on === true;
    }

    async function syncMembership() {
        const id = pocket.conversationId();
        const version = ++requestVersion;

        if (id === null) {
            removeChip();
            modeOn = null;
            return;
        }

        try {
            const membership = await pocket.api(`session/${id}`);
            if (version !== requestVersion || id !== pocket.conversationId()) return;

            if (!isSession(membership)) {
                removeChip();
                modeOn = false;
                return;
            }

            addChip();
            const state = await pocket.api(`mode/${id}`);
            if (version === requestVersion && id === pocket.conversationId()) {
                modeOn = isOn(state);
                render();
            }
        } catch {
            // Keep the current chip and state when membership or mode refresh fails.
        }
    }

    async function toggle() {
        const id = pocket.conversationId();
        if (chip === null || id === null) return;
        if (busy) return;

        ++requestVersion;
        busy = true;
        render();

        try {
            const state = await pocket.api(`mode/${id}`, {}, { method: "POST" });
            if (id === pocket.conversationId() && chip !== null) {
                modeOn = isOn(state);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "The request failed.";
            pocket.notify("error", `Could not toggle orchestrator mode: ${message}`);
        } finally {
            busy = false;
            if (id === pocket.conversationId()) render();
            void syncMembership();
        }
    }

    const stopConversation = pocket.onConversation(() => void syncMembership());
    const stopChanged = pocket.on("changed", (data) => {
        if (
            data !== null &&
            typeof data === "object" &&
            data.conversationId === pocket.conversationId()
        ) {
            void syncMembership();
        }
    });

    void syncMembership();

    return () => {
        removeChip();
        stopConversation();
        stopChanged();
    };
}
