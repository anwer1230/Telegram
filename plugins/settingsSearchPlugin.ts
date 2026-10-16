import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
import type {Plugin} from 'vite';

const require = createRequire(import.meta.url);

/**
 * Keeps `src/lib/settingsSearch/generated.ts` in step with the settings tabs it
 * is derived from: regenerated on every build and whenever a settings tab (or a
 * language string it may reference) changes during development.
 */
export default function settingsSearchPlugin(rootDir: string = process.cwd()): Plugin {
  const GENERATOR_CJS = path.resolve(rootDir, 'src/scripts/generate_settings_search.cjs');
  const GENERATOR_JS = path.resolve(rootDir, 'src/scripts/generate_settings_search.js');
  const GENERATOR = fs.existsSync(GENERATOR_CJS) ? GENERATOR_CJS : GENERATOR_JS;
  const OUT_FILE = path.resolve(rootDir, 'src/lib/settingsSearch/generated.ts');

  const loadGenerator = () => {
    if (!fs.existsSync(GENERATOR)) {
      return null;
    }
    delete require.cache[require.resolve(GENERATOR)];
    return require(GENERATOR).generate;
  };

  const watched = [
    path.join(rootDir, 'src', 'components', 'sidebarLeft'),
    path.join(rootDir, 'src', 'components', 'sidebarRight'),
    path.join(rootDir, 'src', 'components', 'solidJsTabs'),
    path.join(rootDir, 'src', 'lang.ts'),
    path.join(rootDir, 'src', 'scripts', 'generate_settings_search.cjs'),
    path.join(rootDir, 'src', 'scripts', 'generate_settings_search.js'),
    path.join(rootDir, 'src', 'scripts', 'in', 'settings-links.csv')
  ];

  const run = () => {
    try {
      const generator = loadGenerator();
      if (!generator) return;
      const {sections, entries, changed} = generator();
      if(changed) console.log(`[settings-search] ${sections.length} sections, ${entries.length} entries`);
    } catch(err: any) {
      console.error('[settings-search] failed to generate the index:', err.message);
    }
  };

  let timeout: NodeJS.Timeout | undefined;

  return {
    name: 'tweb:settings-search-index',
    enforce: 'pre' as const,
    buildStart() {
      run();
    },
    handleHotUpdate({file}) {
      if(file === OUT_FILE || !/\.(tsx?|js|cjs|csv)$/.test(file) || !watched.some((dir) => file.startsWith(dir))) {
        return;
      }

      clearTimeout(timeout);
      timeout = setTimeout(run, 200);
    }
  };
}
