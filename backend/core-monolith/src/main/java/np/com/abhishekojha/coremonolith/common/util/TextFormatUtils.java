package np.com.abhishekojha.coremonolith.common.util;

public final class TextFormatUtils {

    private TextFormatUtils() {
    }

    /**
     * Converts a name to title case, e.g. "RAM BAHADUR" or "rAm Shyam" -> "Ram Shyam".
     */
    public static String toTitleCase(String input) {
        if (input == null) return null;
        String trimmed = input.trim().replaceAll("\\s+", " ");
        if (trimmed.isEmpty()) return trimmed;

        StringBuilder result = new StringBuilder(trimmed.length());
        for (String word : trimmed.split(" ")) {
            if (!word.isEmpty()) {
                result.append(Character.toUpperCase(word.charAt(0)));
                if (word.length() > 1) {
                    result.append(word.substring(1).toLowerCase());
                }
            }
            result.append(' ');
        }
        return result.substring(0, result.length() - 1);
    }
}
