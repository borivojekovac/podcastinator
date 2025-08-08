// Podcastinator App - Language Support Utility

/**
 * Provides language support information for TTS models
 */
class LanguageSupport {
    constructor() {
        // Map of TTS models to their supported languages
        this.modelLanguageMap = {
            'tts-1': [
                'english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'dutch',
                'japanese', 'chinese', 'arabic', 'hindi', 'korean', 'russian', 'polish',
                'turkish', 'swedish', 'danish', 'norwegian', 'finnish', 'czech', 'romanian'
            ],
            'tts-1-hd': [
                'english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'dutch',
                'japanese', 'chinese', 'arabic', 'hindi', 'korean', 'russian', 'polish',
                'turkish', 'swedish', 'danish', 'norwegian', 'finnish', 'czech', 'romanian'
            ],
            'gpt-4o-mini-tts': [
                'afrikaans', 'akan', 'albanian', 'amharic', 'arabic', 'armenian', 'assamese', 'aymara',
                'azerbaijani', 'bambara', 'basque', 'belarusian', 'bemba', 'bengali', 'bhojpuri', 'bosnian',
                'breton', 'bulgarian', 'burmese', 'catalan', 'cebuano', 'chewa', 'chhattisgarhi', 'chichewa',
                'chinese', 'cornish', 'croatian', 'czech', 'dagbani', 'danish', 'dogri', 'dutch',
                'egyptian arabic', 'english', 'estonian', 'ewe', 'fijian hindi', 'filipino', 'finnish', 'frisian',
                'fulfulde', 'ga', 'galician', 'georgian', 'german', 'greek', 'guarani', 'gujarati',
                'haitian creole', 'hausa', 'hawaiian', 'hebrew', 'hindi', 'hungarian', 'icelandic', 'igbo',
                'indonesian', 'irish', 'italian', 'jamaican patois', 'japanese', 'javanese', 'kannada', 'kazakh',
                'khmer', 'khoekhoe', 'kinyarwanda', 'kirundi', 'kongo', 'korean', 'kurdish', 'kyrgyz',
                'lao', 'latvian', 'lingala', 'lithuanian', 'luganda', 'luo', 'luxembourgish', 'madurese',
                'magahi', 'malagasy', 'malay', 'maltese', 'mandarin chinese', 'maori', 'mapudungun', 'marathi',
                'mossi', 'nahuatl', 'nepali', 'norwegian', 'occitan', 'odia', 'oromo', 'pashto',
                'persian', 'polish', 'portuguese', 'punjabi', 'quechua', 'romanian', 'russian', 'samoan',
                'sango', 'sanskrit', 'saraiki', 'sardinian', 'scottish gaelic', 'serbian', 'setswana', 'shanghainese',
                'shona', 'sindhi', 'sinhala', 'slovak', 'slovenian', 'somali', 'spanish', 'standard arabic',
                'swahili', 'swedish', 'tagalog', 'tahitian', 'tajik', 'tamil', 'telugu', 'thai',
                'tigre', 'tigrinya', 'tok pisin', 'tongan', 'tsonga', 'turkmen', 'turkish', 'ukrainian',
                'urdu', 'uzbek', 'vietnamese', 'welsh', 'wolof', 'xhosa', 'yucatec maya', 'zulu'
            ]
        };
        
        // Language display names (for UI)
        this.languageDisplayNames = {
            'afrikaans': 'Afrikaans',
            'akan': 'Akan (Twi)',
            'albanian': 'Albanian',
            'amharic': 'Amharic',
            'arabic': 'Arabic (العربية)',
            'armenian': 'Armenian',
            'assamese': 'Assamese',
            'aymara': 'Aymara',
            'azerbaijani': 'Azerbaijani',
            'bambara': 'Bambara',
            'basque': 'Basque',
            'belarusian': 'Belarusian',
            'bemba': 'Bemba',
            'bengali': 'Bengali',
            'bhojpuri': 'Bhojpuri',
            'bosnian': 'Bosnian',
            'breton': 'Breton',
            'bulgarian': 'Bulgarian',
            'burmese': 'Burmese (Myanmar)',
            'catalan': 'Catalan',
            'cebuano': 'Cebuano',
            'chewa': 'Chewa',
            'chhattisgarhi': 'Chhattisgarhi',
            'chichewa': 'Chichewa (Nyanja)',
            'chinese': 'Chinese (中文)',
            'cornish': 'Cornish',
            'croatian': 'Croatian',
            'czech': 'Czech (Čeština)',
            'dagbani': 'Dagbani',
            'danish': 'Danish (Dansk)',
            'dogri': 'Dogri',
            'dutch': 'Dutch (Nederlands)',
            'egyptian arabic': 'Egyptian Arabic',
            'english': 'English',
            'estonian': 'Estonian',
            'ewe': 'Ewe',
            'fijian hindi': 'Fijian Hindi',
            'filipino': 'Filipino (Tagalog)',
            'finnish': 'Finnish (Suomi)',
            'french': 'French (Français)',
            'frisian': 'Frisian',
            'fulfulde': 'Fulfulde',
            'ga': 'Ga',
            'galician': 'Galician',
            'georgian': 'Georgian',
            'german': 'German (Deutsch)',
            'greek': 'Greek',
            'guarani': 'Guarani',
            'gujarati': 'Gujarati',
            'haitian creole': 'Haitian Creole',
            'hausa': 'Hausa',
            'hawaiian': 'Hawaiian',
            'hebrew': 'Hebrew',
            'hindi': 'Hindi (हिन्दी)',
            'hungarian': 'Hungarian',
            'icelandic': 'Icelandic',
            'igbo': 'Igbo',
            'indonesian': 'Indonesian',
            'irish': 'Irish',
            'italian': 'Italian (Italiano)',
            'jamaican patois': 'Jamaican Patois',
            'japanese': 'Japanese (日本語)',
            'javanese': 'Javanese',
            'kannada': 'Kannada',
            'kazakh': 'Kazakh',
            'khmer': 'Khmer (Cambodian)',
            'khoekhoe': 'Khoekhoe',
            'kinyarwanda': 'Kinyarwanda',
            'kirundi': 'Kirundi',
            'kongo': 'Kongo',
            'korean': 'Korean (한국어)',
            'kurdish': 'Kurdish (Northern Kurmanji)',
            'kyrgyz': 'Kyrgyz',
            'lao': 'Lao',
            'latvian': 'Latvian',
            'lingala': 'Lingala',
            'lithuanian': 'Lithuanian',
            'luganda': 'Luganda',
            'luo': 'Luo',
            'luxembourgish': 'Luxembourgish',
            'madurese': 'Madurese',
            'magahi': 'Magahi',
            'malagasy': 'Malagasy',
            'malay': 'Malay (Bahasa Malaysia)',
            'maltese': 'Maltese',
            'mandarin chinese': 'Mandarin Chinese',
            'maori': 'Maori',
            'mapudungun': 'Mapudungun',
            'marathi': 'Marathi',
            'mossi': 'Mossi',
            'nahuatl': 'Nahuatl',
            'nepali': 'Nepali',
            'norwegian': 'Norwegian (Norsk)',
            'occitan': 'Occitan',
            'odia': 'Odia (Oriya)',
            'oromo': 'Oromo',
            'pashto': 'Pashto',
            'persian': 'Persian (Farsi)',
            'polish': 'Polish (Polski)',
            'portuguese': 'Portuguese (Português)',
            'punjabi': 'Punjabi (Western)',
            'quechua': 'Quechua',
            'romanian': 'Romanian (Română)',
            'russian': 'Russian (Русский)',
            'samoan': 'Samoan',
            'sango': 'Sango',
            'sanskrit': 'Sanskrit',
            'saraiki': 'Saraiki',
            'sardinian': 'Sardinian',
            'scottish gaelic': 'Scottish Gaelic',
            'serbian': 'Serbian',
            'setswana': 'Setswana',
            'shanghainese': 'Wu Chinese (Shanghainese)',
            'shona': 'Shona',
            'sindhi': 'Sindhi',
            'sinhala': 'Sinhala',
            'slovak': 'Slovak',
            'slovenian': 'Slovenian',
            'somali': 'Somali',
            'spanish': 'Spanish (Español)',
            'standard arabic': 'Standard Arabic',
            'swahili': 'Swahili',
            'swedish': 'Swedish (Svenska)',
            'tagalog': 'Tagalog',
            'tahitian': 'Tahitian',
            'tajik': 'Tajik',
            'tamil': 'Tamil',
            'telugu': 'Telugu',
            'thai': 'Thai',
            'tigre': 'Tigre',
            'tigrinya': 'Tigrinya',
            'tok pisin': 'Tok Pisin',
            'tongan': 'Tongan',
            'tsonga': 'Tsonga',
            'turkmen': 'Turkmen',
            'turkish': 'Turkish (Türkçe)',
            'ukrainian': 'Ukrainian',
            'urdu': 'Urdu',
            'uzbek': 'Uzbek',
            'vietnamese': 'Vietnamese',
            'welsh': 'Welsh',
            'wolof': 'Wolof',
            'xhosa': 'Xhosa',
            'yucatec maya': 'Yucatec Maya',
            'zulu': 'Zulu'
        };
    }
    
    /**
     * Get supported languages for a specific TTS model
     * @param {string} model - TTS model name
     * @returns {Array} - Array of supported language codes
     */
    getSupportedLanguages(model) {
        return this.modelLanguageMap[model] || ['english'];
    }
    
    /**
     * Get display name for a language code
     * @param {string} languageCode - Language code
     * @returns {string} - Display name for the language
     */
    getLanguageDisplayName(languageCode) {
        return this.languageDisplayNames[languageCode] || languageCode;
    }
    
    /**
     * Get all supported languages as options for a select element
     * @param {string} model - TTS model name
     * @returns {Array} - Array of objects with value and text properties
     */
    getLanguageOptions(model) {
        const languages = this.getSupportedLanguages(model);
        
        return languages.map(lang => ({
            value: lang,
            text: this.getLanguageDisplayName(lang)
        }));
    }
}

export default LanguageSupport;
