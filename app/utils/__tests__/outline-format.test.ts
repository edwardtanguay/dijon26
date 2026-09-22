import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  simplifyUrl,
  createFormattedLinkHtml,
  renderFormattedContent,
  cleanSingleLineText,
  MARKDOWN_LINK_REGEX,
} from '../outline-format'

describe('outline-format', () => {
  describe('simplifyUrl', () => {
    it('simplifies standard URLs and removes www.', () => {
      expect(simplifyUrl('https://www.wikipedia.org/wiki/Dijon')).toBe('wikipedia.org')
      expect(simplifyUrl('https://fr.wikipedia.org/wiki/Claus_Sluter')).toBe('fr.wikipedia.org')
    })
  })

  describe('createFormattedLinkHtml', () => {
    it('uses specified link text when provided', () => {
      const html = createFormattedLinkHtml('https://en.wikipedia.org/wiki/Kir_(cocktail)', 'Kir')
      expect(html).toContain('<span>Kir</span>')
      expect(html).toContain('href="https://en.wikipedia.org/wiki/Kir_(cocktail)"')
      expect(html).not.toContain('Kir)')
    })

    it('falls back to simplified URL when link text is absent', () => {
      const html = createFormattedLinkHtml('https://fr.wikipedia.org/wiki/Lac_Kir')
      expect(html).toContain('<span>fr.wikipedia.org</span>')
    })

    it('handles YouTube links with specialized icon and default text', () => {
      const html = createFormattedLinkHtml('https://www.youtube.com/watch?v=123')
      expect(html).toContain('<span>youtube.com</span>')
      expect(html).toContain('text-red-600')
    })
  })

  describe('renderFormattedContent', () => {
    it('correctly parses markdown links containing parentheses in URL like Kir_(cocktail)', () => {
      const input = '[Kir](https://en.wikipedia.org/wiki/Kir_(cocktail))'
      const output = renderFormattedContent(input)

      // Must have href with full cocktail URL including closing parenthesis
      expect(output).toContain('href="https://en.wikipedia.org/wiki/Kir_(cocktail)"')
      // Must display Kir
      expect(output).toContain('<span>Kir</span>')
      // Must NOT leave a trailing parenthesis outside the link
      expect(output.endsWith('</a>')).toBe(true)
      expect(output).not.toContain('Kir)')
      expect(output).not.toContain('cocktail</a>)')
    })

    it('correctly parses standard markdown links without parentheses in URL', () => {
      const input = '[Claus Sluter](https://fr.wikipedia.org/wiki/Claus_Sluter)'
      const output = renderFormattedContent(input)
      expect(output).toContain('href="https://fr.wikipedia.org/wiki/Claus_Sluter"')
      expect(output).toContain('<span>Claus Sluter</span>')
    })

    it('correctly parses bare URLs with parentheses', () => {
      const input = 'Voir https://en.wikipedia.org/wiki/Kir_(cocktail) pour la recette'
      const output = renderFormattedContent(input)
      expect(output).toContain('href="https://en.wikipedia.org/wiki/Kir_(cocktail)"')
      expect(output).toContain('pour la recette')
    })

    it('correctly parses bare URLs wrapped in parentheses in prose', () => {
      const input = '(voir https://en.wikipedia.org/wiki/Kir_(cocktail))'
      const output = renderFormattedContent(input)
      expect(output).toContain('href="https://en.wikipedia.org/wiki/Kir_(cocktail)"')
      expect(output.startsWith('(voir ')).toBe(true)
      expect(output.endsWith(')')).toBe(true)
    })

    it('formats bold, italic, emoji and pronunciation', () => {
      const input = '**Gras** et *italique* avec :thinking: [prononciation]'
      const output = renderFormattedContent(input)
      expect(output).toContain('<strong class="font-semibold text-gray-900 dark:text-white">Gras</strong>')
      expect(output).toContain('<em class="italic text-gray-800 dark:text-gray-200">italique</em>')
      expect(output).toContain('🤔')
      expect(output).toContain('[prononciation]</span>')
    })
  })

  describe('cleanSingleLineText', () => {
    it('extracts link text without trailing parenthesis on parenthesized URLs', () => {
      const input = '- [Kir](https://en.wikipedia.org/wiki/Kir_(cocktail))##tag'
      const output = cleanSingleLineText(input)
      expect(output).toBe('Kir')
    })
  })
})
