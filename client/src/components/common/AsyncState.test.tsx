import { render, screen } from '@testing-library/react';
import { ErrorState, PageLoader } from './AsyncState';

describe('async states', () => {
  it('announces loading state accessibly', () => {
    render(<PageLoader label="Loading projects" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading projects');
  });

  it('shows a useful error message', () => {
    render(<ErrorState message="The server is unavailable." />);
    expect(screen.getByRole('alert')).toHaveTextContent('The server is unavailable.');
  });
});
