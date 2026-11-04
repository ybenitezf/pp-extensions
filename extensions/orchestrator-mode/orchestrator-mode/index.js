// The composer chip follows this conversation's durable orchestrator-mode state.
export default function setup(pocket) {
    pocket.style("look.css");
    let conversationId = null;
    let modeOn = false;
    let busy = false;
    let requestVersion = 0;

    const chip = pocket.composerButton({
        id: "orchestrator-mode",
        title: "Orchestrator mode: Off",
        icon: "shield",
        run: () => toggle(),
    });
    function render() {
        const modeLabel = modeOn ? "On" : "Off";
        const updating = busy ? " (updating…)" : "";

        chip.update({
            title: `Orchestrator mode: ${modeLabel}${updating}`,
        });
    }

    function isOn(value) {
        return value !== null && typeof value === "object" && value.on === true;
    }

    async function sync() {
        const id = pocket.conversationId();
        const version = ++requestVersion;

        if (id !== conversationId) {
            conversationId = id;
            modeOn = false;
            render();
        }
        if (id === null) return;

        try {
            const state = await pocket.api(`mode/${id}`);
            if (version === requestVersion && id === pocket.conversationId()) {
                modeOn = isOn(state);
                render();
            }
        } catch {
            // Keep the last known state when a refresh fails.
        }
    }

    async function toggle() {
        const id = pocket.conversationId();
        if (id === null) {
            pocket.notify("warning", "Cannot toggle orchestrator mode: no conversation is open.");
            return;
        }
        if (busy) return;

        ++requestVersion;
        conversationId = id;
        busy = true;
        render();

        try {
            const state = await pocket.api(`mode/${id}`, {}, { method: "POST" });
            if (id === pocket.conversationId()) {
                modeOn = isOn(state);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "The request failed.";
            pocket.notify("error", `Could not toggle orchestrator mode: ${message}`);
        } finally {
            busy = false;
            render();
            void sync();
        }
    }

    const stopConversation = pocket.onConversation(() => void sync());
    const stopChanged = pocket.on("changed", (data) => {
        if (
            !busy &&
            data !== null &&
            typeof data === "object" &&
            data.conversationId === pocket.conversationId()
        ) {
            void sync();
        }
    });

    void sync();

    return () => {
        stopConversation();
        stopChanged();
    };
}
