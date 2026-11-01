// Optional feature modules. Each line exports one module that has
// `register({ tool, prompt, resource, z, citation, canon, english, providers })`.
// Add exactly one line per feature so parallel pull requests merge cleanly, e.g.
// export * as calendar from '../calendar.mjs';
export * as verify from '../verify.mjs';
export * as findCitations from '../find-citations.mjs';
export * as calendar from '../calendar.mjs';
export * as daily from '../daily.mjs';
export * as topics from '../topics.mjs';
export * as dppn from '../dppn.mjs';
export * as vinayaBmc from '../vinaya-bmc.mjs';
export * as abhidhamma from '../abhidhamma.mjs';
export * as pronunciation from '../pronunciation.mjs';
export * as paritta from '../paritta.mjs';
export * as talks from '../talks.mjs';
export * as memorise from '../memorise.mjs';
