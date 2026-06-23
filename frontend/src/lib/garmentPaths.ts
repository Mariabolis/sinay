// SVG path data for garment silhouettes, keyed by the product `style` value.
// Shared between BuilderTeaser and CartPage so neither duplicates these strings.

export const TOP_PATHS: Record<string, string> = {
  classic_short_sleeve:
    'M70,20 L85,12 L100,22 L115,12 L130,20 L130,40 L150,55 L150,80 L130,72 L130,160 L70,160 L70,72 L50,80 L50,55 L70,40 Z',
  sleeveless:
    'M78,14 L84,30 L70,30 L70,160 L130,160 L130,30 L116,30 L122,14 L100,24 Z',
  relaxed_shirt:
    'M65,20 L82,10 L100,22 L118,10 L135,20 L135,42 L155,58 L155,84 L135,76 L135,164 L65,164 L65,76 L45,84 L45,58 L65,42 Z',
}

export const BOTTOM_PATHS: Record<string, string> = {
  shorts:   'M55,15 L145,15 L148,65 L112,65 L110,100 L90,100 L88,65 L52,65 Z',
  bermuda:  'M55,15 L145,15 L149,75 L113,75 L109,130 L91,130 L87,75 L51,75 Z',
  wide_leg:
    'M55,15 L145,15 L150,90 L115,90 L108,160 L92,160 L92,95 L108,95 L108,90 L92,90 L85,160 L69,160 L62,90 L50,90 Z',
}
