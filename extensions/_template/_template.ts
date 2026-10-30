/**
 * An example module for Pi Pocket: one tool for the model, and one command for people.
 *
 * This file is the template. Copy its folder for each new extension, and read README.md in this folder to know what to
 * change. Change each name in "Names to change", at the end of this file.
 */
import { Type } from "@earendil-works/pi-ai";
import { defineExtension, defineTool } from "@earendil-works/pi-durable";
import type { Web } from "./_pocket.d.ts";

// The names of this module. They are here, in one place, so that a copy is easy to rename.
const extensionName = "my-example";
const toolName = "my_example_count";
const commandName = "my-example-count";

/** The number of words in a text: the parts between spaces, tabs, and line breaks. */
function countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word !== "").length;
}

// One tool. `parameters` uses `Type` from `@earendil-works/pi-ai`. `defineTool` comes from `@earendil-works/pi-durable`.
const countWordsTool = defineTool({
    name: toolName,
    description: "Count the words in a text.",
    parameters: Type.Object({ text: Type.String({ description: "The text to count" }) }),
    replay: "safe",
    execute: async (args) => ({
        output: [{ type: "text" as const, text: `${countWords(args.text)} words` }],
    }),
});

// This tool returns `output`, so the module needs version 2 of the extension API. A Pi Pocket before 0.18 does not load it.
export const pocketApi = 2;

export default function createExtension(_host: unknown, web: Web) {
    web.command(commandName, {
        description: "Count the words in a text",
        args: "<text>",
        scope: "conversation",
        handler: (args) => ({
            type: "toast",
            level: "info",
            message: `${countWords(args)} words`,
        }),
    });

    return defineExtension({ name: extensionName, tools: [countWordsTool] });
}

/**
 * Names to change, in the copy of this folder:
 *
 * - The folder name and the file name: `extensions/<name>/<name>.ts`. The two are the same, in lowercase letters,
 *   digits, `-`, and `_`, and the name does not start with `pocket-` or `_`.
 * - `extensionName`: the name of the extension that the module installs. Use a prefix of your own.
 * - `toolName`: the name of the tool. It must not be the name of a built-in tool.
 * - `commandName`: the name of the command. Use lowercase letters, digits, `-`, and `_`, with one `-` at least.
 * - The comment at the top of this file, and the `description` of the tool and of the command: say what your module does.
 * - `pocketApi = 2`: keep it while a tool of the module returns `output`. Remove the line when no tool returns it.
 */
