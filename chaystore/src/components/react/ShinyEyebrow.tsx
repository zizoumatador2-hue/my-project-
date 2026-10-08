import ShinyText from '../../react-bits/ShinyText';

export default function ShinyEyebrow({ text }: { text: string }) {
  return <ShinyText text={text} speed={4} color="#c9a46a" shineColor="#fff4dc" spread={110} />;
}
