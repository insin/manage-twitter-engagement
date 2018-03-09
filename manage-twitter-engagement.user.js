// ==UserScript==
// @name        Manage Twitter Engagement
// @description Manage extra "engagement" on Twitter by hiding Retweets and algorithmic timeline tweets (Retweetlikes)
// @namespace   https://github.com/insin/manage-twitter-engagement/
// @match       https://twitter.com/
// @version     2
// ==/UserScript==

const CIRCLE = 'display: inline-block; width: 20px; height: 20px; vertical-align: text-bottom; border-radius: 50%'

// Identify retweets by by their retweet id in element data
const RETWEET_SELECTOR = 'div[data-retweet-id]'
// Identify retweetlikes by the heart icon in their context header
const RETWEETLIKE_SELECTOR = '.tweet-context .Icon--heartBadge'

let retweetBG
let retweetlikeBG

function setThemeColours(isNightMode) {
  retweetBG = `background-color: ${isNightMode ? '#1b3036' : '#f5fcf8'}`
  retweetlikeBG = `background-color: ${isNightMode ? '#2f2836' : '#fdf6f8'}`
}

setThemeColours(/nightmode/.test(document.querySelector('link[class="coreCSSBundles"]').href))

// Default to hiding Retweetlikes because GTFO, Twitter
let hideRetweets = localStorage.mte_hideRetweets === 'true'
let hideRetweetLikes = localStorage.mte_hideRetweetLikes === undefined || localStorage.mte_hideRetweetLikes === 'true'

let retweetCount = 0
let retweetLikeCount = 0

let getAllTweets = () => document.querySelectorAll('#stream-items-id > .stream-item')

let $controls = document.createElement('div')
$controls.style = 'padding: 0 16px 16px 16px'
$controls.innerHTML = `
  <div style="margin-bottom: 3px">
    <label>
      <input type="checkbox" class="mte_hideRetweets">
      Hide <span class="mte_retweetCount">0</span>
      Retweet<span class="mte_retweetPlural">s</span>
      <span class="mte_retweetColour" style="${retweetBG}; ${CIRCLE}"></span>
    </label>
  </div>
  <div>
    <label>
      <input type="checkbox" class="mte_hideRetweetLikes">
      Hide <span class="mte_retweetLikeCount">0</span>
      Retweetlike<span class="mte_retweetLikePlural">s</span>
      <span class="mte_retweetlikeColour" style="${retweetlikeBG}; ${CIRCLE}"></span>
    </label>
  </div>
`

let $hideRetweets = $controls.querySelector('.mte_hideRetweets')
let $retweetCount = $controls.querySelector('.mte_retweetCount')
let $retweetPlural = $controls.querySelector('.mte_retweetPlural')
$hideRetweets.checked = hideRetweets
$hideRetweets.addEventListener('click', (e) => {
  hideRetweets = e.target.checked
  localStorage.mte_hideRetweets = hideRetweets
  for (let tweet of getAllTweets()) {
    if (tweet.querySelector(RETWEET_SELECTOR)) {
      tweet.style.display = hideRetweets ? 'none' : ''
    }
  }
})

let $hideRetweetLikes = $controls.querySelector('.mte_hideRetweetLikes')
let $retweetLikeCount = $controls.querySelector('.mte_retweetLikeCount')
let $retweetLikePlural = $controls.querySelector('.mte_retweetLikePlural')
$hideRetweetLikes.checked = hideRetweetLikes
$hideRetweetLikes.addEventListener('click', (e) => {
  hideRetweetLikes = e.target.checked
  localStorage.mte_hideRetweetLikes = hideRetweetLikes
  for (let tweet of getAllTweets()) {
    if (tweet.querySelector(RETWEETLIKE_SELECTOR)) {
      tweet.style.display = hideRetweetLikes ? 'none' : ''
    }
  }
})

function updateCounts() {
  $retweetCount.innerHTML = retweetCount
  $retweetPlural.innerHTML = retweetCount === 1 ? '' : 's'
  $retweetLikeCount.innerHTML = retweetLikeCount
  $retweetLikePlural.innerHTML = retweetLikeCount === 1 ? '' : 's'
}

function processTweets(tweets) {
  for (let tweet of tweets) {
    if (tweet.querySelector(RETWEETLIKE_SELECTOR)) {
      retweetLikeCount++
      tweet.style = retweetlikeBG
      if (hideRetweetLikes) {
        tweet.style.display = 'none'
      }
    }
    else if (tweet.querySelector(RETWEET_SELECTOR)) {
      retweetCount++
      tweet.style = retweetBG
      if (hideRetweets) {
        tweet.style.display = 'none'
      }
    }
  }
  updateCounts()
}

// Deal with the initial batch of tweets
processTweets(getAllTweets())

// Watch the stream for the appearance of new tweets
let streamItems = document.getElementById('stream-items-id')
new MutationObserver(mutations =>
  mutations.forEach(mutation => processTweets(mutation.addedNodes))
).observe(streamItems, {childList: true})

// Watch <head> for the core CSS bundle changing when nightmode is toggled
new MutationObserver(mutations =>
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length === 0 ||
        mutation.addedNodes[0].getAttribute('class') !== 'coreCSSBundles') {
      return
    }

    // Update retweet and retweetlike highlight colours
    setTimeout(() => {
      setThemeColours(/nightmode/.test(mutation.addedNodes[0].href))
      document.querySelector('.mte_retweetColour').style = `${retweetBG}; ${CIRCLE}`
      document.querySelector('.mte_retweetlikeColour').style = `${retweetlikeBG}; ${CIRCLE}`
      for (tweet of getAllTweets()) {
        if (tweet.querySelector(RETWEETLIKE_SELECTOR)) {
          tweet.style = retweetlikeBG
        }
        else if (tweet.querySelector(RETWEET_SELECTOR)) {
          tweet.style = retweetBG
        }
      }
    }, 500)
  })
).observe(document.querySelector('head'), {childList: true, attributes: true})

// Show controls
let $profileCard = document.querySelector('div.ProfileCardStats')
if ($profileCard) {
  $profileCard.insertAdjacentElement('afterend', $controls)
}
