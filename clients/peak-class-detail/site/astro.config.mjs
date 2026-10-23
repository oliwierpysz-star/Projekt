import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://peakclassdetail.pl',
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'auto' },
});
