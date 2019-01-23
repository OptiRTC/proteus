import { UniqueID } from 'uniqueid';
// Note: to be comprehensive we need to run this unil
// X collisions occur, which is probably a huge run
// Just trust Math.random()
test('UniqueID returns lots of unique IDs', () => {
    const cycles = 100000;
    let ids = new Set();
    for (let i = 0; i < cycles; ++i) {
        ids.add(new UniqueID().id);
    }
    expect(ids.size).toEqual(cycles);
});
//# sourceMappingURL=uniqueid.test.js.map