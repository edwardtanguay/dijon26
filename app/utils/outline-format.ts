export const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export const simplifyUrl = (rawUrl: string): string => {
  try {
    const urlObj = new URL(rawUrl)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return rawUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || rawUrl
  }
}

export const createFormattedLinkHtml = (url: string, linkText?: string): string => {
  const isYoutube = url.toLowerCase().includes('youtube.com') || url.toLowerCase().includes('youtu.be')

  let displayText = ''
  if (linkText && linkText.trim()) {
    displayText = linkText.trim()
  } else if (isYoutube) {
    displayText = 'youtube.com'
  } else {
    displayText = escapeHtml(simplifyUrl(url))
  }

  // 18x12px matches the height of lowercase letters (x-height)
  const youtubeIcon = `<svg class="inline-block w-[18px] h-[12px] mr-1 text-red-600 fill-none stroke-current align-middle flex-shrink-0" viewBox="1.5 4.5 21 15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 2px;"><rect width="20" height="14" x="2" y="5" rx="4" fill="currentColor" stroke="none"/><polygon points="10 9 15 12 10 15 10 9" fill="white" stroke="none"/></svg>`

  const externalLinkIcon = `<svg class="inline-block w-3.5 h-3.5 mr-1 text-indigo-500 stroke-current fill-none align-middle flex-shrink-0" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`

  const icon = isYoutube ? youtubeIcon : externalLinkIcon

  return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline text-indigo-600 dark:text-indigo-400 no-underline hover:underline hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors">${icon}<span>${displayText}</span></a>`
}

/**
 * Expression régulière pour les liens Markdown supportant les parenthèses équilibrées dans l'URL.
 * Ex: [Kir](https://en.wikipedia.org/wiki/Kir_(cocktail))
 */
export const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(((?:[^()\s]+|\([^()\s]*\))+)\)/g

/**
 * Expression régulière pour les URLs brutes supportant les parenthèses équilibrées dans l'URL.
 * Ex: https://en.wikipedia.org/wiki/Kir_(cocktail)
 */
export const BARE_URL_REGEX = /(^|[\s(])(https?:\/\/[^\s<)]+(?:\([^\s<)]*\)[^\s<)]*)*)/g

export const renderFormattedContent = (text: string): string => {
  if (!text) return ''

  let html = escapeHtml(text)

  // Emoticons: :thinking: -> WhatsApp style thinking face emoji
  const whatsappThinkingEmoji = `<span class="inline font-emoji text-lg align-middle" title=":thinking:">🤔</span>`
  html = html.replace(/:thinking:/g, whatsappThinkingEmoji)

  // 1. Liens Markdown : [titre](url) (avec support des parenthèses dans l'URL)
  html = html.replace(
    MARKDOWN_LINK_REGEX,
    (_match, title, url) => createFormattedLinkHtml(url, title)
  )

  // 2. URLs brutes (http:// ou https://) avec support des parenthèses équilibrées
  html = html.replace(
    BARE_URL_REGEX,
    (_match, prefix, url) => `${prefix}${createFormattedLinkHtml(url)}`
  )

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')

  // Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')

  // Pronunciation: [text] at end of line
  html = html.replace(
    /\s*\[([^\]]+)\]\s*$/,
    ' <span class="font-mono text-sm text-[#b8a862] dark:text-[#d3c578] font-normal font-courier">[$1]</span>'
  )

  return html
}

/**
 * Nettoyer le texte d'un item outline pour un affichage sur une seule ligne
 * en retirant puces, formatages, tags images et en conservant le libellé des liens Markdown.
 */
export const cleanSingleLineText = (text: string | null | undefined): string => {
  if (!text) return ''
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-*•]\s+/, ''))
    .filter((l) => l.length > 0)
    .join(' — ')
    .replace(/##[a-zA-Z0-9_\-]+/g, '')
    .replace(MARKDOWN_LINK_REGEX, '$1')
    .trim()
}
