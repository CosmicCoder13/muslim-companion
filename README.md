# Muslim Companion Chrome Extension

A comprehensive Chrome extension for Muslims featuring prayer times, Qibla direction, Islamic quotes, and more in a sleek, modern interface.

## Features

- **Prayer Times**: Accurate prayer times based on your location with multiple calculation methods
- **Qibla Direction**: Find the direction to Mecca from anywhere in the world with an intuitive compass arrow
- **Daily Islamic Quotes**: Inspiring quotes from the Quran and Hadith
- **Prayer Notifications**: Timely reminders for each prayer
- **Multiple Languages**: Support for English, Arabic, French, and Urdu
- **Customizable Settings**: Choose calculation methods, notification preferences, and more

## Installation

### From Source Code

1. Clone this repository
2. Add the required image files to the `icons` directory
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" at the top right
5. Click "Load unpacked" and select the repository directory

### Required Image Files

Before you can use the extension, you'll need to add the following image files:

#### Icons Directory
- `icon16.png` - 16x16 pixel icon
- `icon48.png` - 48x48 pixel icon
- `icon128.png` - 128x128 pixel icon

## Usage

After installation, you can access Muslim Companion by clicking on its icon in the Chrome toolbar.

### Setting Up

1. When you first open the extension, it will attempt to detect your location
2. You can manually refresh your location by clicking the "Detect" button
3. Navigate to the Settings tab to configure your preferences:
   - Select your preferred prayer calculation method
   - Enable or disable prayer time notifications
   - Choose your preferred language

### Features

#### Prayer Times
- View accurate prayer times for your current location
- See the next prayer time with a countdown
- Support for multiple calculation methods to match your local conventions

#### Qibla Direction
- Visual compass with an arrow pointing towards the Kaaba in Mecca
- Accurate calculation based on your current location
- Displays the exact angle from North

#### Daily Inspiration
- Daily Islamic quotes from the Quran and Hadith
- Refreshes each day for continued inspiration

#### Multi-language Support
- English
- Arabic (العربية)
- French (Français)
- Urdu (اردو)

## APIs Used

- [Aladhan API](https://aladhan.com/prayer-times-api) - For prayer times
- [BigDataCloud Reverse Geocoding](https://www.bigdatacloud.com/) - For converting coordinates to city names

## Contributing

Contributions are welcome! Feel free to submit pull requests or create issues for bugs and feature requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all the APIs that make this extension possible
- Inspired by the Muslim community's need for convenient Islamic tools