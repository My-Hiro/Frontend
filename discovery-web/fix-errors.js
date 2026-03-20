const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix @/components/features -> @/features
    content = content.replace(/@\/components\/features/g, '@/features');

    // Fix UI imports in features: ./ui/ -> @/components/ui/
    if (filePath.includes(path.join('src', 'features'))) {
      content = content.replace(/(['"])\.\/ui\//g, '$1@/components/ui/');
    }

    // Fix import.meta.env -> process.env
    content = content.replace(/import\.meta\.env\.VITE_MERCHANT_URL/g, 'process.env.NEXT_PUBLIC_MERCHANT_URL');
    content = content.replace(/import\.meta\.env\.VITE_GOOGLE_MAPS_API_KEY/g, 'process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    content = content.replace(/import\.meta\.env\.BASE_URL/g, '(process.env.NEXT_PUBLIC_BASE_URL || "/")');
    
    // Fix implicit any in event handlers
    content = content.replace(/onPress=\{\(storeId\) =>/g, 'onPress={(storeId: string) =>');
    content = content.replace(/onPress=\{\(banner\) =>/g, 'onPress={(banner: any) =>');
    content = content.replace(/onPress=\{\(productId\) =>/g, 'onPress={(productId: string) =>');
    
    // In profile/page.tsx
    content = content.replace(/\.then\(\(payload\) =>/g, '.then((payload: any) =>');
    content = content.replace(/\.catch\(\(error\) =>/g, '.catch((error: any) =>');
    content = content.replace(/payload\.threads\.some\(\(entry\)/g, 'payload.threads.some((entry: any)');

    // In services/discovery.service.ts
    content = content.replace(/\.flatMap\(\(store\) => store\.products/g, '.flatMap((store: any) => store.products');
    content = content.replace(/\.map\(\(product\) => toFallbackProductCard/g, '.map((product: any) => toFallbackProductCard');
    content = content.replace(/\.filter\(\(store\) => resolveFallbackStoreCategoryId/g, '.filter((store: any) => resolveFallbackStoreCategoryId');
    content = content.replace(/\.map\(\(store\) => toFallbackStoreCard/g, '.map((store: any) => toFallbackStoreCard');
    content = content.replace(/fallbackStoreSeed\.find\(\(store\) =>/g, 'fallbackStoreSeed.find((store: any) =>');
    content = content.replace(/fallbackStore\.products\.map\(\(product\) =>/g, 'fallbackStore.products.map((product: any) =>');
    content = content.replace(/fallbackStoreSeed\.flatMap\(\(store\) =>/g, 'fallbackStoreSeed.flatMap((store: any) =>');
    content = content.replace(/\.filter\(\(product\) => product\.id/g, '.filter((product: any) => product.id');
    content = content.replace(/\.map\(\(product\) => \(\{/g, '.map((product: any) => ({');
    content = content.replace(/matches\.find\(\(entry\) =>/g, 'matches.find((entry: any) =>');
    content = content.replace(/\.filter\(\(entry\) => entry\.store/g, '.filter((entry: any) => entry.store');
    content = content.replace(/\.map\(\(entry\) => \(\{/g, '.map((entry: any) => ({');
    
    // In PopularProductsStrip.tsx and StoreCarousel.tsx
    content = content.replace(/setApi=\{\(nextApi\) => setApi\(nextApi\)\}/g, 'setApi={(nextApi: any) => setApi(nextApi)}');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
