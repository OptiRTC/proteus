import { TmpStorage } from 'storage';
import { readFileSync, writeFileSync, existsSync } from 'fs';
test('Storage supports create/write/read', () => {
    let store = new TmpStorage();
    expect(existsSync(store.path)).toBe(true);
    writeFileSync(store.path + "/test.txt", "Hello There");
    let result = readFileSync(store.path + "/test.txt");
    expect(result.toString()).toEqual("Hello There");
});
test('Storage destroy-on-finish', () => {
    let store = new TmpStorage();
    expect(existsSync(store.path)).toBe(true);
    store.finish();
    expect(existsSync(store.path)).toBe(false);
});
//# sourceMappingURL=storage.test.js.map