import DisallowedFiles from '../../../src/tests/git/disallowed-files';

describe( 'git disallowed files test', () => {
	it( 'should call blocker for source trees that contain node_modules', () => {
		const paths = [
			'index.js',
			'node_modules/leftpad/main.js',
			'test.js',
		];
		const test = new DisallowedFiles();

		expect( () => test.evaluatePaths( paths ) ).toThrow();
	} );

	it( 'should call blocker for source trees that contain nested node_modules', () => {
		const paths = [
			'index.js',
			'lib/node_modules/leftpad/main.js', // nested in subfolder
			'test.js',
		];
		const test = new DisallowedFiles();

		expect( () => test.evaluatePaths( paths ) ).toThrow();
	} );

	it( 'should not call blocker for source trees that do not contain node_modules', () => {
		const paths = [
			'modules/main.js',
			'nodemodules/main.js',
			'node_module/main.js',
		];
		const test = new DisallowedFiles();

		expect( () => test.evaluatePaths( paths ) ).not.toThrow();
	} );
} );

