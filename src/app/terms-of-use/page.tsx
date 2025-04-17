import React from 'react';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export default async function TermsOfUsePage() {
  // Read markdown content from public directory
  const filePath = path.join(process.cwd(), 'public', 'TERMS_OF_USE.md');
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const html = marked.parse(markdown);
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>
      <div className="prose prose-neutral dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
