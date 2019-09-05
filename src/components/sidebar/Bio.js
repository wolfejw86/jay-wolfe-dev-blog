import React from "react"
import "./sidebar.css"

import Img from "gatsby-image"

const Bio = ({ author, tagline, img }) => {
  return (
    <div className="bio-main w-75">
      <Img fixed={img} style={{ borderRadius: "50%" }} />
      <h3 className="mt-2 author-bio">{author}</h3>
      <small className="text-muted">{tagline}</small>
    </div>
  )
}

export default Bio
