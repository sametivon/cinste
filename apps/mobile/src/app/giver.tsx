import { Redirect } from 'expo-router';

/** Compatibility entry retained for the resolver's safe `/giver` destination. */
export default function GiverEntry() {
  return <Redirect href={'/native/giver' as any} />;
}
