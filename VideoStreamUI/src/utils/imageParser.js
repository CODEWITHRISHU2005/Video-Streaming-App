export const processProfileImage = (imageSource) => {
    if (!imageSource) return null;

    if (imageSource.startsWith('data:')) {
        try {
            const base64Content = imageSource.split(',')[1];
            if (base64Content) {
                const decoded = atob(base64Content);
                
                if (decoded.startsWith('http')) {
                    return decoded;
                }
                
                if (decoded.startsWith('data:')) {
                    return processProfileImage(decoded);
                }
            }
        } catch (e) {
        }
        return imageSource;
    }

    if (imageSource.startsWith('http')) {
        return imageSource;
    }

    // Check if it's the Java Arrays.toString() format: "[1, 2, 3]"
    if (typeof imageSource === 'string' && imageSource.startsWith('[') && imageSource.endsWith(']')) {
        try {
            // Remove brackets and split by comma
            const byteValues = imageSource.slice(1, -1).split(',').map(s => parseInt(s.trim()));
            
            // Convert to Uint8Array (handling signed bytes from Java)
            const uint8Array = new Uint8Array(byteValues.map(b => (b < 0 ? b + 256 : b)));
            
            // Convert to binary string
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            
            // Convert to Base64
            const base64 = btoa(binary);
            
            // Return as Data URI
            return `data:image/jpeg;base64,${base64}`;
        } catch (e) {
            console.error("Failed to parse image array string:", e);
            return null;
        }
    }

    return imageSource;
};
