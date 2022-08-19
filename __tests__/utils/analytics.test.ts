import { snakeCase } from '../../src/utils/analytics';

describe( 'utils/analytics', () => {
	describe( 'snakeCase', () => {
		it( 'correctly converts to snake_case', () => {
			const testCases = [
				'Snake Case',
				'Snake-Case',
				'Snake---Case',
				' sNAKE  cASE \n ',
				' snAke .... cAse',
			];

			testCases.forEach( testCase => {
				expect( snakeCase( testCase ) ).toBe( 'snake_case' );
			} );
		} );
	} );
} );
