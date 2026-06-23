import Hero from '../components/home/Hero'
import Manifesto from '../components/home/Manifesto'
import WaveDivider from '../components/home/WaveDivider'
import IconStrip from '../components/home/IconStrip'
import SetsGrid from '../components/home/SetsGrid'
import BuilderTeaser from '../components/home/BuilderTeaser'
import ProductPreviewGrid from '../components/home/ProductPreviewGrid'
import FooterRibbon from '../components/home/FooterRibbon'

export default function Home() {
  return (
    <>
      <Hero />

      <Manifesto />

      <WaveDivider />

      <IconStrip />

      <WaveDivider flip stroke="#8B7568" opacity={0.35} />

      <SetsGrid />

      <WaveDivider />

      <BuilderTeaser />

      <ProductPreviewGrid />

      <FooterRibbon />
    </>
  )
}
