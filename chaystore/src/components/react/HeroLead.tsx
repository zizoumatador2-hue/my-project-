import BlurText from '../../react-bits/BlurText';

export default function HeroLead({ text }: { text: string }) {
  return <BlurText text={text} delay={55} animateBy="words" direction="top" stepDuration={0.28} className="lead-blur" />;
}
