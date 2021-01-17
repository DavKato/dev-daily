export const wait = ms => new Promise(res => setTimeout(res, ms));

export const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

export const multiShuffle = async (array, count, throttle, cb) => {
	for (let i = array.length - 1; count > 0; count--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
		// eslint-disable-next-line no-await-in-loop
		await wait(throttle);
		cb(array);
	}
	return array;
};
