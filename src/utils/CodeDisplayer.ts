import { GeneratedFile, FileType } from '../types';

// Simple color utility without external dependencies
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bold: {
    red: (text: string) => `\x1b[1;31m${text}\x1b[0m`,
    green: (text: string) => `\x1b[1;32m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[1;33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[1;34m${text}\x1b[0m`,
    magenta: (text: string) => `\x1b[1;35m${text}\x1b[0m`,
    cyan: (text: string) => `\x1b[1;36m${text}\x1b[0m`,
    white: (text: string) => `\x1b[1;37m${text}\x1b[0m`
  }
};

export interface CodeDisplayOptions {
  showLineNumbers?: boolean;
  showFileStats?: boolean;
  groupByType?: boolean;
  highlightSyntax?: boolean;
}

export class CodeDisplayer {
  private static readonly FILE_TYPE_COLORS = {
    [FileType.COMPONENT]: 'cyan',
    [FileType.STYLE]: 'magenta',
    [FileType.TEST]: 'yellow',
    [FileType.CONFIG]: 'green',
    [FileType.DOCUMENTATION]: 'blue'
  } as const;

  private static readonly LANGUAGE_EXTENSIONS: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.html': 'html',
    '.json': 'json',
    '.md': 'markdown',
    '.vue': 'vue',
    '.py': 'python',
    '.java': 'java',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'c'
  };

  /**
   * Display multiple generated files with proper separation
   */
  public static displayGeneratedFiles(
    files: GeneratedFile[],
    options: CodeDisplayOptions = {}
  ): void {
    if (files.length === 0) {
      console.log(colors.yellow('⚠️  No files to display'));
      return;
    }

    const defaultOptions: CodeDisplayOptions = {
      showLineNumbers: true,
      showFileStats: true,
      groupByType: false,
      highlightSyntax: true,
      ...options
    };

    console.log(colors.bold.green('\n📄 GENERATED CODE FILES'));
    console.log(colors.gray('=' .repeat(60)));

    if (defaultOptions.showFileStats) {
      this.displayStats(files);
    }

    if (defaultOptions.groupByType) {
      this.displayGroupedByType(files, defaultOptions);
    } else {
      this.displaySequentially(files, defaultOptions);
    }

    console.log(colors.gray('=' .repeat(60)));
    console.log(colors.bold.green('✅ Code display completed\n'));
  }

  /**
   * Display a single file
   */
  public static displayFile(
    file: GeneratedFile,
    options: CodeDisplayOptions = {}
  ): void {
    const defaultOptions: CodeDisplayOptions = {
      showLineNumbers: true,
      showFileStats: false,
      groupByType: false,
      highlightSyntax: true,
      ...options
    };

    this.renderFile(file, defaultOptions);
  }

  /**
   * Display multiple code fragments with custom separators
   */
  public static displayCodeFragments(
    fragments: Array<{ title: string; code: string; language?: string }>,
    options: CodeDisplayOptions = {}
  ): void {
    if (fragments.length === 0) {
      console.log(colors.yellow('⚠️  No code fragments to display'));
      return;
    }

    console.log(colors.bold.green('\n💻 CODE FRAGMENTS'));
    console.log(colors.gray('=' .repeat(60)));

    fragments.forEach((fragment, index) => {
      if (index > 0) {
        console.log(colors.gray('-' .repeat(40)));
      }

      console.log(colors.bold.white(`📝 ${fragment.title}`));
      
      if (fragment.language) {
        console.log(colors.gray(`Language: ${fragment.language}`));
      }

      console.log('');
      this.renderCode(fragment.code, fragment.language, options);
      console.log('');
    });

    console.log(colors.gray('=' .repeat(60)));
    console.log(colors.bold.green('✅ Fragment display completed\n'));
  }

  private static displayStats(files: GeneratedFile[]): void {
    const stats = files.reduce((acc, file) => {
      acc[file.type] = (acc[file.type] || 0) + 1;
      return acc;
    }, {} as Record<FileType, number>);

    const totalLines = files.reduce((acc, file) => {
      return acc + file.content.split('\n').length;
    }, 0);

    console.log(colors.bold.white('\n📊 FILE STATISTICS:'));
    Object.entries(stats).forEach(([type, count]) => {
      const color = this.FILE_TYPE_COLORS[type as FileType] || 'white';
      console.log(`  ${colors[color]('●')} ${type}: ${count} file(s)`);
    });
    console.log(`  📝 Total lines: ${totalLines}`);
    console.log('');
  }

  private static displayGroupedByType(
    files: GeneratedFile[],
    options: CodeDisplayOptions
  ): void {
    const grouped = files.reduce((acc, file) => {
      if (!acc[file.type]) {
        acc[file.type] = [];
      }
      acc[file.type].push(file);
      return acc;
    }, {} as Record<FileType, GeneratedFile[]>);

    Object.entries(grouped).forEach(([type, filesOfType]) => {
      const color = this.FILE_TYPE_COLORS[type as FileType] || 'white';
      console.log(colors.bold[color](`\n📁 ${type} FILES`));
      console.log(colors.gray('-' .repeat(30)));

      filesOfType.forEach((file, index) => {
        if (index > 0) {
          console.log(colors.gray('· · ·'));
        }
        this.renderFile(file, options, false);
      });
    });
  }

  private static displaySequentially(
    files: GeneratedFile[],
    options: CodeDisplayOptions
  ): void {
    files.forEach((file, index) => {
      if (index > 0) {
        console.log(colors.gray('\n' + '=' .repeat(40) + '\n'));
      }
      this.renderFile(file, options);
    });
  }

  private static renderFile(
    file: GeneratedFile,
    options: CodeDisplayOptions,
    showHeader: boolean = true
  ): void {
    if (showHeader) {
      const color = this.FILE_TYPE_COLORS[file.type] || 'white';
      console.log(colors.bold[color](`📄 ${file.path}`));
      
      if (file.description) {
        console.log(colors.gray(`   ${file.description}`));
      }
      
      const lineCount = file.content.split('\n').length;
      console.log(colors.gray(`   Lines: ${lineCount} | Type: ${file.type}`));
      console.log('');
    }

    const extension = this.getFileExtension(file.path);
    const language = this.LANGUAGE_EXTENSIONS[extension];
    
    this.renderCode(file.content, language, options);
  }

  private static renderCode(
    code: string,
    language?: string,
    options: CodeDisplayOptions = {}
  ): void {
    const lines = code.split('\n');
    const maxLineNumberWidth = lines.length.toString().length;

    lines.forEach((line, index) => {
      let output = '';

      if (options.showLineNumbers) {
        const lineNumber = (index + 1).toString().padStart(maxLineNumberWidth, ' ');
        output += colors.gray(`${lineNumber} │ `);
      }

      // Basic syntax highlighting (simple approach)
      if (options.highlightSyntax && language) {
        output += this.highlightLine(line, language);
      } else {
        output += line;
      }

      console.log(output);
    });
  }

  private static highlightLine(line: string, language: string): string {
    // Simple syntax highlighting - can be enhanced with a proper syntax highlighter
    switch (language) {
      case 'typescript':
      case 'javascript':
        return line
          .replace(/\b(const|let|var|function|class|interface|type|enum|import|export|from|as|async|await|return|if|else|for|while|try|catch|finally)\b/g, 
            colors.blue('$1'))
          .replace(/\b(true|false|null|undefined|this)\b/g, colors.magenta('$1'))
          .replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, colors.green('$1$2$1'))
          .replace(/\/\/.*$/g, colors.gray('$&'))
          .replace(/\/\*[\s\S]*?\*\//g, colors.gray('$&'));
      
      case 'css':
      case 'scss':
      case 'less':
        return line
          .replace(/([.#]?[\w-]+)\s*\{/g, colors.yellow('$1') + '{')
          .replace(/([\w-]+)\s*:/g, colors.cyan('$1') + ':')
          .replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, colors.green('$1$2$1'))
          .replace(/\/\*[\s\S]*?\*\//g, colors.gray('$&'));
      
      case 'html':
        return line
          .replace(/<(\/?[\w-]+)/g, colors.blue('<$1'))
          .replace(/>/g, colors.blue('>'))
          .replace(/([\w-]+)=/g, colors.cyan('$1') + '=')
          .replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, colors.green('$1$2$1'));
      
      case 'json':
        return line
          .replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1(?=\s*:)/g, colors.cyan('$1$2$1'))
          .replace(/:\s*(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, ': ' + colors.green('$1$2$1'))
          .replace(/:\s*(true|false|null|\d+)/g, ': ' + colors.magenta('$1'));
      
      default:
        return line;
    }
  }

  private static getFileExtension(filePath: string): string {
    const match = filePath.match(/\.[^.]*$/);
    return match ? match[0] : '';
  }

  /**
   * Display code with custom title and separator
   */
  public static displayWithTitle(
    title: string,
    code: string,
    language?: string,
    options: CodeDisplayOptions = {}
  ): void {
    console.log(colors.bold.green(`\n📄 ${title.toUpperCase()}`));
    console.log(colors.gray('=' .repeat(Math.max(title.length + 4, 40))));
    
    if (language) {
      console.log(colors.gray(`Language: ${language}\n`));
    }
    
    this.renderCode(code, language, options);
    console.log(colors.gray('=' .repeat(Math.max(title.length + 4, 40))));
    console.log('');
  }
} 