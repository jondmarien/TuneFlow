import React from 'react';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | TuneFlow',
  description: 'Read the Privacy Policy for TuneFlow.'
};

function getMarkdownHtml(filePath: string): { html: string; error: string } {
  let html = '';
  let error = '';
  try {
    const markdown = fs.readFileSync(filePath, 'utf-8');
    html = marked.parse(markdown) as string;
  } catch (e) {
    error = 'Privacy Policy document not found.';
  }
  return { html, error };
}

export default function PrivacyPolicyPage() {
  const filePath = path.join(process.cwd(), 'public', 'PRIVACY_POLICY.md');
  const { html, error } = getMarkdownHtml(filePath);
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      {error ? (
        <div className="text-red-600 font-semibold">{error}</div>
      ) : (
        <div className="prose prose-neutral dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </main>
  );
}
