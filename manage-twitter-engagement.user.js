// ==UserScript==
// @name        Manage Twitter Engagement
// @description Manage extra "engagement" on Twitter by hiding Retweets and algorithmic timeline tweets (Retweetlikes)
// @namespace   https://github.com/insin/manage-twitter-engagement/
// @match       https://twitter.com/*
// @version     3
// ==/UserScript==

const CIRCLE = 'display: inline-block; width: 20px; height: 20px; vertical-align: text-bottom; border-radius: 50%'

// Identify retweets by by their retweet id in element data
const RETWEET_SELECTOR = 'div[data-retweet-id]'
// Identify retweetlikes by the heart icon in their context header
const RETWEETLIKE_SELECTOR = '.tweet-context .Icon--heartBadge'

// Default to hiding Retweetlikes because GTFO, Twitter
let hideRetweets = localStorage.mte_hideRetweets === 'true'
let hideRetweetLikes = localStorage.mte_hideRetweetLikes === undefined || localStorage.mte_hideRetweetLikes === 'true'

// UI variables
let retweetCount = 0
let retweetLikeCount = 0
let streamObserver = null
let styleModeObserver = null
let retweetBG
let retweetlikeBG
let $retweetCount
let $retweetPlural
let $retweetLikeCount
let $retweetLikePlural

let getAllTweets = () => document.querySelectorAll('#stream-items-id > .stream-item')

function injectUI() {
  let $controls = document.createElement('div')
  $controls.style = 'padding: 0 16px 16px 16px'
  $controls.innerHTML = `
    <div style="margin-bottom: 3px">
      <label>
        <input type="checkbox" class="mte_hideRetweets">
        Hide <span class="mte_retweetCount">${retweetCount}</span>
        Retweet<span class="mte_retweetPlural">${retweetCount === 1 ? '' : 's'}</span>
        <span class="mte_retweetColour" style="${retweetBG}; ${CIRCLE}"></span>
      </label>
    </div>
    <div>
      <label>
        <input type="checkbox" class="mte_hideRetweetLikes">
        Hide <span class="mte_retweetLikeCount">${retweetLikeCount}</span>
        Retweetlike<span class="mte_retweetLikePlural">${retweetLikeCount === 1 ? '' : 's'}</span>
        <span class="mte_retweetlikeColour" style="${retweetlikeBG}; ${CIRCLE}"></span>
      </label>
    </div>
  `

  let $hideRetweets = $controls.querySelector('.mte_hideRetweets')
  $retweetCount = $controls.querySelector('.mte_retweetCount')
  $retweetPlural = $controls.querySelector('.mte_retweetPlural')
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
  $retweetLikeCount = $controls.querySelector('.mte_retweetLikeCount')
  $retweetLikePlural = $controls.querySelector('.mte_retweetLikePlural')
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

  let $profileCard = document.querySelector('div.ProfileCardStats')
  if ($profileCard) {
    $profileCard.insertAdjacentElement('afterend', $controls)
  }
}

function setThemeColours({nightMode}) {
  retweetBG = `background-color: ${nightMode ? '#1b3036' : '#f5fcf8'}`
  retweetlikeBG = `background-color: ${nightMode ? '#2f2836' : '#fdf6f8'}`
}

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
}

function startManagingEngagement() {
  // Reset runtime variables
  retweetCount = 0
  retweetLikeCount = 0
  setThemeColours({
    nightMode: /nightmode/.test(document.querySelector('link[class="coreCSSBundles"]').href)
  })

  // Deal with the initial batch of tweets
  processTweets(getAllTweets())

  // Watch the stream for the appearance of new tweets
  streamObserver = new MutationObserver(mutations =>
    mutations.forEach(mutation => {
      processTweets(mutation.addedNodes)
      updateCounts()
    })
  )
  streamObserver.observe(document.getElementById('stream-items-id'), {
    childList: true
  })

  // Watch <head> for the core CSS bundle changing when nightmode is toggled
  styleModeObserver = new MutationObserver(mutations =>
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length === 0 ||
          mutation.addedNodes[0].getAttribute('class') !== 'coreCSSBundles') {
        return
      }

      // Update retweet and retweetlike highlight colours
      setTimeout(() => {
        setThemeColours({
          nightMode: /nightmode/.test(mutation.addedNodes[0].href)
        })
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
  )
  styleModeObserver.observe(document.querySelector('head'), {
    attributes: true,
    childList: true,
  })

  // Show controls
  injectUI()
}

function stopManagingEngagement() {
  streamObserver.disconnect()
  streamObserver = null
  styleModeObserver.disconnect()
  styleModeObserver = null
}

/**
 * When you navigate between sections, the Twitter website loads HTML for the
 * next page and injects it.
 *
 * Check for page changes by observing <body>'s class attribute, which is
 * updated with loading state classes and after loading, for non-homepage pages,
 * a <Name>Page class.
 */
new MutationObserver(() => {
  // Ignore loading states
  if (/(swift-loading|pushing-state)/.test(document.body.className)) return

  let page = /(\w+)Page/.exec(document.body.className)

  // The homepage has no <Name>Page class
  if (!page) {
    if (streamObserver == null) {
      startManagingEngagement()
    }
  }
  else if (streamObserver) {
    stopManagingEngagement()
  }
}).observe(document.body, {attributes: true, attributeFilter: ['class']})
