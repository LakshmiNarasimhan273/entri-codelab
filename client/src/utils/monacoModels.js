/**
 * Utility to extract the latest buffer code directly from all active Monaco Editor models,
 * bypassing any React state lag or pending debounce flushes.
 */
export const getActiveMonacoCodeMap = (fallbackMap = {}) => {
  const codeMap = { ...fallbackMap };

  if (typeof window !== 'undefined' && window.monaco && window.monaco.editor) {
    const models = window.monaco.editor.getModels();
    for (const model of models) {
      const uriPath = model.uri.path || '';
      let cleanPath = uriPath;

      if (cleanPath.startsWith('/workspace/')) {
        cleanPath = cleanPath.replace('/workspace/', '');
      } else if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
      }

      if (cleanPath) {
        codeMap[cleanPath] = model.getValue();
      }
    }
  }

  return codeMap;
};

