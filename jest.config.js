module.exports = {
	moduleNameMapper: {
		'^@/(src)/(.*)$': '<rootDir>/$1/$2',
	},
	testMatch: [
		'**/__tests__/**/*.+(ts|tsx|js)',
		'**/*.(spec|test).+(ts|tsx|js)',
	],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
};
