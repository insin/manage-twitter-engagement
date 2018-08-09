// ==UserScript==
// @name        Manage Twitter Engagement
// @description Manage "engagement" on Twitter by moving retweets and algorithmic tweets to their own lists
// @namespace   https://github.com/insin/manage-twitter-engagement/
// @match       https://twitter.com/*
// @version     8
// ==/UserScript==

// Identify retweets by by their retweet id in element data
const RETWEET_SELECTOR = 'div[data-retweet-id]'

// Identify retweetlikes by the heart icon in their context header
const RETWEETLIKE_SELECTOR = '.tweet-context .Icon--heartBadge'

// State
let config
let displayedTweetType
let streamObserver
let $tabs

let getAllTweets = () => document.querySelectorAll('#stream-items-id > .stream-item')

function activateTab($tab) {
  $tab.classList.add('is-active')
  $tab.classList.remove('u-textUserColor')
  $tab.querySelector('span').classList.remove('u-hiddenVisually')
  $tab.querySelector('a').classList.add('u-hiddenVisually')

  // Deactivate the previously-active tab
  let $otherTab = $tab.parentNode.firstElementChild
  do {
    if ($otherTab !== $tab && $otherTab.classList.contains('is-active')) {
      $otherTab.classList.remove('is-active')
      $otherTab.classList.add('u-textUserColor')
      $otherTab.querySelector('span').classList.add('u-hiddenVisually')
      $otherTab.querySelector('a').classList.remove('u-hiddenVisually')
      break
    }
  } while ($otherTab = $otherTab.nextElementSibling)
}

function toggleDisplayedTweets(tweets) {
  for (let tweet of tweets) {
    if (tweet.querySelector(RETWEETLIKE_SELECTOR)) {
      tweet.style.display = displayedTweetType === 'suggested' ? '' : 'none'
    }
    else if (tweet.querySelector(RETWEET_SELECTOR)) {
      tweet.style.display = displayedTweetType === 'retweets' ? '' : 'none'
    }
    else {
      tweet.style.display = displayedTweetType === 'tweets' ? '' : 'none'
    }
  }
}

function injectUI() {
  // Don't do anything if we don't need a UI
  if (config.hideRetweets && config.hideSuggestedTweets) {
    return
  }

  // It seems like Twitter caches some homepage content on navigation and restores it later?
  // Without this, navigating from Home → Notifications → Home results in a non-functional dupe.
  if (document.querySelector('#mte_tabs')) {
    document.querySelector('#mte_tabs').remove()
  }

  $tabs = document.createElement('div')
  $tabs.id = 'mte_tabs'
  $tabs.innerHTML = `<div class="ProfileHeading">
    <div class="ProfileHeading-content">
      <ul class="ProfileHeading-toggle">
        <li class="ProfileHeading-toggleItem is-active" data-type="tweets">
          <span aria-hidden="true">Tweets</span>
          <a class="ProfileHeading-toggleLink u-hiddenVisually" href="#" title="Tweets with original content">Tweets</a>
          <span class="u-hiddenVisually">Tweets with original content</span>
        </li>
        <li class="ProfileHeading-toggleItem u-textUserColor" data-type="retweets">
          <span aria-hidden="true" class="u-hiddenVisually">Retweets</span>
          <a class="ProfileHeading-toggleLink" href="#" title="Tweets shared by people you follow">Retweets</a>
          <span class="u-hiddenVisually">Tweets shared by people you follow</span>
        </li>
        <li class="ProfileHeading-toggleItem u-textUserColor" data-type="suggested">
          <span aria-hidden="true" class="u-hiddenVisually">Suggested tweets</span>
          <span class="u-hiddenVisually">Algorithmic tweets based on faves</span>
          <a class="ProfileHeading-toggleLink" href="#" title="Algorithmic tweets based on faves">Suggested tweets</a>
        </li>
      </ul>
    </div>
  </div>`

  for (let $tab of $tabs.querySelectorAll('li')) {
    if ($tab.dataset.type === 'retweets' && config.hideRetweets ||
        $tab.dataset.type === 'suggested' && config.hideSuggestedTweets) {
      $tab.style.display = 'none'
      continue
    }

    $tab.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault()
      activateTab($tab)
      displayedTweetType = $tab.dataset.type
      toggleDisplayedTweets(getAllTweets())
    })
  }

  let $streamContainer = document.querySelector('div.stream-container')
  if ($streamContainer) {
    $streamContainer.insertAdjacentElement('beforebegin', $tabs)
  }
}

function startManagingEngagement() {
  // Always start on the tweets list
  displayedTweetType = 'tweets'

  // Deal with the initial batch of tweets
  toggleDisplayedTweets(getAllTweets())

  // Watch the stream for the appearance of new tweets
  streamObserver = new MutationObserver(mutations =>
    mutations.forEach(mutation => toggleDisplayedTweets(mutation.addedNodes))
  )
  streamObserver.observe(document.getElementById('stream-items-id'), {
    childList: true
  })

  // Show controls
  injectUI()
}

function stopManagingEngagement() {
  // There won't be any UI to clean up if everything is hidden
  if ($tabs) {
    $tabs.remove()
    $tabs = null
  }
  streamObserver.disconnect()
  streamObserver = null
}

/**
 * When you navigate between sections, the Twitter website loads HTML for the
 * next page and injects it.
 *
 * Check for page changes by observing <body>'s class attribute, which is
 * updated with loading state classes, then checking the URL to see if we're on
 * the homepage.
 */
new MutationObserver(() => {
  // Ignore loading states
  if (/(swift-loading|pushing-state)/.test(document.body.className)) return

  if (window.location.pathname === '/') {
    if (streamObserver == null) {
      streamObserver = {disconnect(){}}
      chrome.storage.local.get((storedConfig) => {
        // TODO Provide a way to configure the user script version
        // For now, manually replace with config = {hideRetweets: true, hideSuggestedTweets: true}
        config = storedConfig
        startManagingEngagement()
      })
    }
  }
  else if (streamObserver) {
    stopManagingEngagement()
  }
}).observe(document.body, {attributes: true, attributeFilter: ['class']})
