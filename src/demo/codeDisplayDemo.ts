import { CodeDisplayer } from '../utils/CodeDisplayer';
import { GeneratedFile, FileType } from '../types';

/**
 * Demo function to show code display functionality
 */
export function demonstrateCodeDisplay(): void {
  console.log('🚀 Демонстрация отображения кода\n');

  // Example 1: Display single code fragment
  const reactComponent = `import React from 'react';
import './Button.css';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <button
      className={\`btn btn--\${variant}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};`;

  CodeDisplayer.displayWithTitle(
    'React Button Component',
    reactComponent,
    'typescript'
  );

  // Example 2: Display multiple code fragments
  const fragments = [
    {
      title: 'Component Styles',
      code: `.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn--primary {
  background-color: #007bff;
  color: white;
}

.btn--primary:hover {
  background-color: #0056b3;
}

.btn--secondary {
  background-color: #6c757d;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}`,
      language: 'css'
    },
    {
      title: 'Test File',
      code: `import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  test('renders button with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('is disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});`,
      language: 'typescript'
    }
  ];

  CodeDisplayer.displayCodeFragments(fragments);

  // Example 3: Display as generated files
  const generatedFiles: GeneratedFile[] = [
    {
      path: 'src/components/Button/Button.tsx',
      content: reactComponent,
      type: FileType.COMPONENT,
      description: 'Reusable Button component with variants'
    },
    {
      path: 'src/components/Button/Button.css',
      content: fragments[0].code,
      type: FileType.STYLE,
      description: 'Button component styles'
    },
    {
      path: 'src/components/Button/Button.test.tsx',
      content: fragments[1].code,
      type: FileType.TEST,
      description: 'Unit tests for Button component'
    },
    {
      path: 'src/components/Button/index.ts',
      content: `export { Button } from './Button';
export type { ButtonProps } from './Button';`,
      type: FileType.COMPONENT,
      description: 'Component barrel export'
    }
  ];

  CodeDisplayer.displayGeneratedFiles(generatedFiles, {
    showLineNumbers: true,
    showFileStats: true,
    groupByType: true,
    highlightSyntax: true
  });
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateCodeDisplay();
}