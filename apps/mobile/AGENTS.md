This is an Expo/React Native application. Preserve mobile-first performance,
accessibility, and the locked CINSTE authority boundaries.

## Expo and routing

- Before changing Expo, EAS, or React Native APIs, read the installed `expo`
  major version and the matching Expo documentation.
- Use Expo Router. Routes live in `src/app/`; keep components, hooks, and
  utilities outside that directory.
- If `ios/` and `android/` do not exist, use Continuous Native Generation.
  Configure native behavior in app configuration and config plugins. Do not
  create or edit generated native directories by hand.
- Expo Go includes only bundled native modules. A new native module requires a
  development build before device validation.

## Validation

Run the relevant mobile typecheck and tests. Run Expo-specific checks when
native configuration or dependencies change. iOS is the current release scope;
keep ordinary development compatible with Windows and Expo Go on iPhone.
