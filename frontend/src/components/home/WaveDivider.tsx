interface Props {
  flip?:    boolean
  stroke?:  string
  opacity?: number
}

export default function WaveDivider({
  flip    = false,
  stroke  = '#C98FA0',
  opacity = 0.5,
}: Props) {
  const d = flip
    ? 'M0,14 Q25,24 50,14 T100,14 T150,14 T200,14 T250,14 T300,14 T350,14 T400,14'
    : 'M0,14 Q25,4 50,14 T100,14 T150,14 T200,14 T250,14 T300,14 T350,14 T400,14'
  return (
    <svg
      viewBox="0 0 400 28"
      preserveAspectRatio="none"
      className="w-full h-7 block wave-breathe"
      aria-hidden="true"
    >
      <path d={d} fill="none" strokeWidth="1.6" stroke={stroke} opacity={opacity} />
    </svg>
  )
}
