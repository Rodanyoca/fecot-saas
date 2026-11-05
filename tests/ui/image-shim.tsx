import React from "react"
export default function Image({ src, alt, fill, unoptimized: _unoptimized, priority: _priority, ...props }: React.ComponentProps<"img"> & { fill?: boolean; unoptimized?: boolean; priority?: boolean }) {
  return <img src={src} alt={alt} {...props} style={fill ? { position: "absolute", inset: 0, height: "100%", width: "100%", ...props.style } : props.style} />
}
