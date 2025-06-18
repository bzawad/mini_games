#!/bin/bash

# Cat Meme Matching Game Launcher
# This script opens the game in your default browser

echo "🐱 Starting Cat Meme Matching Game! 🐱"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Path to the HTML file
HTML_FILE="$SCRIPT_DIR/index.html"

# Check if the HTML file exists
if [ ! -f "$HTML_FILE" ]; then
    echo "❌ Error: index.html not found in $SCRIPT_DIR"
    echo "Make sure all game files are in the same directory as this script."
    exit 1
fi

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🚀 Opening game in your default browser..."
    open "$HTML_FILE"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🚀 Opening game in your default browser..."
    xdg-open "$HTML_FILE"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    echo "🚀 Opening game in your default browser..."
    start "$HTML_FILE"
else
    echo "🚀 Please open the following file in your browser:"
    echo "$HTML_FILE"
fi

echo "✨ Have fun matching those cat memes! ✨"
echo ""
echo "Game Features:"
echo "🤖 Solo vs Computer (Easy/Normal/Hard)"
echo "👫 Local Multiplayer"
echo "🎯 Score tracking with player colors"
echo "🔄 New game and home buttons"
echo ""
echo "How to Play:"
echo "• Click two cards to flip them over"
echo "• If they match, you get a point and another turn"
echo "• If they don't match, remember where they are!"
echo "• The player with the most matches wins!" 