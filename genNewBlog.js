const fs = require("fs")
const path = require("path")
const datefns = require("date-fns")

const blogPostName = process.argv[2]

if (!blogPostName) {
  throw new Error("Blog post folder name is required argument")
}

const folderPath = path.join(
  __dirname,
  "content",
  "blog",
  blogPostName.replace(/\s/g, "-")
)
fs.mkdirSync(folderPath)

fs.writeFileSync(
  `${folderPath}/index.md`,
  `---
title: "${blogPostName}"
tags: []
published: false
date: "${datefns.format(new Date(), "yyyy-MM-dd")}"
---

Curabitur tincidunt hendrerit justo. Praesent nisl dui, mollis vitae quam eu, dignissim faucibus lorem. Sed vitae erat at sem suscipit laoreet nec vel diam.
`
)
