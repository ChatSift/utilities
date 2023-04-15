import { expect, test } from 'vitest';
import { chunkArray, groupBy, range } from '../index.js';

test('chunkArray', () => {
	const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
	const chunks = chunkArray(data, 3);

	expect(chunks).toStrictEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
});

test('groupBy', () => {
	const data = [0, 1, 2, 3, 4, 5, 6];
	const grouped = groupBy(data, (x: number) => (x % 2 === 0 ? 'even' : 'odd'));

	expect(grouped).toStrictEqual({
		even: [0, 2, 4, 6],
		odd: [1, 3, 5],
	});
});

test('range', () => {
	expect([...range(0, 10)]).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
