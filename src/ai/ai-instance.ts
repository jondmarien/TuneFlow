// --- AI Instance Setup ---

/**
 * Initializes the Genkit AI instance using the Google Gemini model.
 *
 * - Loads prompts from the './prompts' directory
 * - Uses the Google GenAI plugin with API key from environment variables
 * - Sets the default model to 'googleai/gemini-2.0-flash'
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

/**
 * The Genkit AI instance.
 */
export const ai = genkit({
  /**
   * The directory containing the prompts.
   */
  promptDir: './prompts',
  /**
   * The plugins used by the AI instance.
   */
  plugins: [
    /**
     * The Google GenAI plugin.
     */
    googleAI({
      /**
       * The API key for the Google GenAI plugin.
       */
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  /**
   * The default model used by the AI instance.
   */
  model: 'googleai/gemini-2.0-flash',
});
