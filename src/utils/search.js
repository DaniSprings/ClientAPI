const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const rankSuggestions = (query, options, maxResults = 8) => {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return options.slice(0, maxResults);
  }

  const ranked = options
    .map((option) => {
      const normalizedOption = normalize(option);

      if (!normalizedOption) {
        return null;
      }

      let score = 0;

      if (normalizedOption === normalizedQuery) {
        score = 1000;
      } else if (normalizedOption.startsWith(normalizedQuery)) {
        score = 800 - (normalizedOption.length - normalizedQuery.length);
      } else if (normalizedOption.includes(normalizedQuery)) {
        score = 600 - normalizedOption.indexOf(normalizedQuery);
      } else {
        const matchingWords = normalizedQuery
          .split(" ")
          .filter(Boolean)
          .filter((word) => normalizedOption.includes(word)).length;

        if (matchingWords > 0) {
          score = matchingWords * 100;
        }
      }

      return score > 0 ? { option, score } : null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.option.localeCompare(right.option);
    });

  return ranked.slice(0, maxResults).map((entry) => entry.option);
};

export const buildAutoCorrectResult = (query, suggestions) => {
  const normalizedQuery = normalize(query);
  const normalizedFirst = suggestions[0] ? normalize(suggestions[0]) : "";

  return {
    exact: Boolean(normalizedQuery && normalizedQuery === normalizedFirst),
    corrected: suggestions[0] || null,
    suggestions,
  };
};