// Optional feature modules. Each line exports one module that has
// `register({ tool, prompt, resource, z, citation, canon, english, providers })`.
// Add exactly one line per feature so parallel pull requests merge cleanly, e.g.
// export * as calendar from '../calendar.mjs';
export * as paritta from '../paritta.mjs';
