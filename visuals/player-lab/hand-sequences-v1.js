window.PROMETEO_HAND_SEQUENCES_V1 = {
  version: 1,
  source: "Wikimedia Commons public-domain / CC0 hand assets",
  commons: function (file) {
    return "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + encodeURIComponent(file);
  },
  assets: {
    open: {file:"Open Hand pointing upwards.svg", license:"CC0", source:"Wikimedia Commons"},
    pointRight: {file:"PointingHand.svg", license:"Public Domain", source:"Wikimedia Commons"},
    pointUp: {file:"Pointing hand.svg", license:"Public Domain", source:"Wikimedia Commons"},
    cursor: {file:"Pointing hand cursor vector.svg", license:"CC0", source:"Wikimedia Commons"},
    cursor2: {file:"Hand Cursor.svg", license:"CC0", source:"Wikimedia Commons"},
    upRight: {file:"Hand pointing up and to right.svg", license:"CC0", source:"Wikimedia Commons"},
    down: {file:"Hand pointing down (contour).svg", license:"CC0", source:"Wikimedia Commons"},
    leftDown: {file:"Index pointing left and down.svg", license:"Public Domain", source:"Wikimedia Commons"},
    okay: {file:"Okay hand gesture.svg", license:"CC0", source:"Wikimedia Commons"},
    fist: {file:"Fist.svg", license:"Public Domain", source:"Wikimedia Commons"},
    antique: {file:"Typographic Ornaments - Pointing Hand.svg", license:"Public Domain", source:"Wikimedia Commons"},
    grip: {file:"Hand gripping (horizontal item).svg", license:"CC0", source:"Wikimedia Commons"},
    handshake: {file:"Handshake symbol.svg", license:"CC0", source:"Wikimedia Commons"}
  },
  sequences: {
    IDLE: [
      {asset:"open", x:272, y:137, h:162, r:-0.26, flip:false, hold:118},
      {asset:"pointUp", x:268, y:134, h:156, r:-0.22, flip:false, hold:92},
      {asset:"cursor", x:260, y:136, h:154, r:-0.18, flip:true, hold:104},
      {asset:"upRight", x:267, y:134, h:166, r:-0.28, flip:true, hold:88},
      {asset:"down", x:264, y:135, h:158, r:-0.24, flip:true, hold:112},
      {asset:"okay", x:273, y:138, h:170, r:-0.30, flip:false, hold:94},
      {asset:"pointRight", x:258, y:133, h:154, r:-0.17, flip:true, hold:86},
      {asset:"leftDown", x:265, y:137, h:160, r:-0.25, flip:false, hold:108},
      {asset:"grip", x:269, y:136, h:146, r:-0.16, flip:true, hold:96},
      {asset:"antique", x:263, y:133, h:158, r:-0.19, flip:true, hold:84},
      {asset:"cursor2", x:266, y:136, h:156, r:-0.23, flip:true, hold:102},
      {asset:"fist", x:275, y:140, h:174, r:-0.34, flip:false, hold:124}
    ],
    GRAB: [
      {asset:"open", x:344, y:162, h:160, r:-0.30, flip:false, hold:86},
      {asset:"open", x:299, y:148, h:166, r:-0.24, flip:false, hold:76},
      {asset:"okay", x:255, y:132, h:168, r:-0.20, flip:false, hold:72},
      {asset:"grip", x:221, y:118, h:134, r:-0.10, flip:true, hold:86, commit:true},
      {asset:"fist", x:228, y:121, h:178, r:-0.20, flip:false, hold:92},
      {asset:"grip", x:268, y:136, h:140, r:-0.18, flip:true, hold:76},
      {asset:"fist", x:320, y:155, h:174, r:-0.30, flip:false, hold:94}
    ],
    POINT: [
      {asset:"pointUp", x:340, y:134, h:148, r:-0.15, flip:false, hold:110},
      {asset:"cursor", x:286, y:126, h:152, r:-0.10, flip:true, hold:90},
      {asset:"pointRight", x:245, y:116, h:146, r:-0.03, flip:true, hold:130}
    ],
    OFFER: [
      {asset:"open", x:332, y:156, h:154, r:-0.28, flip:false, hold:110},
      {asset:"handshake", x:274, y:136, h:132, r:-0.12, flip:false, hold:100},
      {asset:"open", x:238, y:124, h:164, r:-0.16, flip:true, hold:140}
    ]
  }
};