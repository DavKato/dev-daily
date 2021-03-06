<script>
  import { onMount } from "svelte";
  import { quintOut } from "svelte/easing";
  import { crossfade } from "svelte/transition";
  import { flip } from "svelte/animate";

  import colorScheme from "./colors";
  import { shuffle, wait } from "./utils";

  import SVG from "./Delete.svelte";

  const [send, receive] = crossfade({
    duration: (d) => Math.sqrt(d * 200),

    fallback(node) {
      if (slideOut || discussionMode) return {};

      const style = getComputedStyle(node);
      const transform = style.transform === "none" ? "" : style.transform;

      return {
        duration: 500,
        easing: quintOut,
        css: (t) => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`,
      };
    },
  });

  let starters, timer; // DOM

  let discussionMode;

  let uid = 1;
  let members = [],
    colors = [];

  let minutes = null,
    seconds = null;

  $: secondsString = String(seconds).padStart(2, "0");

  $: if (minutes || seconds) {
    if (!discussionMode) {
      localStorage.setItem(
        "timeString",
        JSON.stringify(`${minutes}:${secondsString}`)
      );
    }
  }

  const defaults = {
    timeString: "10:00",
  };

  // Don't tell anyone about this..
  let lucky, LuckyDay;

  onMount(() => {
    // Retrieve data from localStorage if exists
    const membersData = JSON.parse(localStorage.getItem("members")) || [];
    members = membersData.map((m) => ({ ...m, id: uid++ }));

    const length =
      JSON.parse(localStorage.getItem("timeString")) || defaults.timeString;
    const timeArr = length.split(":").map((el) => Number(el));
    minutes = timeArr[0];
    seconds = timeArr[1];

    // Shuffle colors
    colors = shuffle(colorScheme);
  });

  // Member CRUD
  const addMember = (input) => {
    const member = {
      id: uid++,
      name: input.value,
      staged: true,
    };
    confirmMembers([...members, member]);
    input.value = "";
  };

  const removeMember = (id) => {
    confirmMembers(members.filter((m) => m.id !== id));
  };

  const onStarterClick = ({ target }, id) => {
    if (discussionMode) {
      return target.style.opacity === "0.3"
        ? (target.style.opacity = 1)
        : (target.style.opacity = 0.3);
    }
    benchMember(id);
  };

  const benchMember = (id) => {
    members.find((m) => m.id === id).staged = false;
    confirmMembers(members);
  };

  const stageMember = (id) => {
    members.find((m) => m.id === id).staged = true;
    confirmMembers(members);
  };

  const confirmMembers = (confirmed) => {
    members = confirmed;
    localStorage.setItem(
      "members",
      JSON.stringify(confirmed.map((m) => ({ name: m.name, staged: m.staged })))
    );
  };

  // Update Timer
  const updateTimer = (e, target) => {
    const num = Math.min(60, Math.max(0, Number(e.target.value)));

    target === "seconds" && !num
      ? (e.target.value = "00")
      : (e.target.value = num);
    target === "minutes" ? (minutes = num) : (seconds = num);
  };

  let slideOut;

  // Start discussion
  const isThisTheDay = async () => {
    if (Math.random() * 22 >= 21) {
      LuckyDay = (await import("./LuckyDay.svelte")).default;
      lucky = true;
      await wait(5400);
      lucky = false;
    }
  };

  const start = () => {
    // Lucky Check
    isThisTheDay();

    slideOut = true;

    animateStarters();
    hideTimer();
  };

  const animateStarters = () => {
    const anim = starters.animate(
      [{ transform: "translate3D(-1800px, 0, 0)" }],
      {
        duration: 500,
        easing: "ease-in",
      }
    );
    anim.onfinish = async () => {
      starters.style.transform = "translate3D(1800px, 0, 0)";

      members = members.filter((m) => m.staged);
      members = shuffle(members);

      await wait(300);
      discussionMode = true;

      await wait(300);

      const end = starters.animate([{ transform: "translate3D(0, 0, 0)" }], {
        duration: 500,
        easing: "ease-out",
        fill: "forwards",
      });

      end.onfinish = () => retrieveTimer();
    };
  };

  const hideTimer = () => {
    const anim = timer.animate(
      [{ transform: "translate3D(0, 300px, 0)", opacity: 0 }],
      {
        duration: 400,
        delay: 200,
        easing: "ease-in",
      }
    );

    anim.onfinish = () => {
      timer.style.opacity = 0;
      timer.style.transform = "translate3D(0, 70px, 0)";
    };
  };

  const retrieveTimer = () => {
    const anim = timer.animate(
      [{ transform: "translate3D(0, 0, 0)", opacity: 1 }],
      {
        duration: 500,
        delay: 200,
        easing: "ease-out",
        fill: "forwards",
      }
    );

    anim.onfinish = () => startTimer();
  };

  // Start the timer
  const startTimer = () => {
    const intvl = setInterval(() => {
      if (seconds === 0) {
        if (minutes === 0) {
          return clearInterval(intvl);
        }
        minutes--;
        seconds = 59;
        return;
      }

      seconds--;
    }, 1000);
  };
</script>

<main class:discussion={discussionMode}>
  {#if !discussionMode}
    <h1 class:sub-out={slideOut}>Choose members</h1>
  {/if}
  <div
    bind:this={starters}
    class="starters container"
    class:discussion={discussionMode}
  >
    {#if !discussionMode}<span class="description">スタメン</span>{/if}

    {#each members.filter((m) => m.staged) as member (member.id)}
      <button
        class="starter member"
        style="background-color:#{colors[member.id]}"
        in:receive={{ key: member.id }}
        out:send={{ key: member.id }}
        animate:flip={{ duration: 250 }}
        on:click={(e) => onStarterClick(e, member.id)}
      >
        {member.name}
      </button>
    {/each}
  </div>

  {#if !discussionMode}
    <aside class:sub-out={slideOut}>
      <input
        type="text"
        placeholder="Add Member"
        on:keydown={(e) => e.key === "Enter" && addMember(e.target)}
      />
      <div class="bench container">
        <span class="description">ベンチ</span>
        {#each members.filter((m) => !m.staged) as member (member.id)}
          <button
            class="member"
            style="background-color:#{colors[member.id]}"
            in:receive={{ key: member.id }}
            out:send={{ key: member.id }}
            animate:flip={{ duration: 250 }}
            on:click={stageMember(member.id)}
          >
            {member.name}
            <div on:click|stopPropagation>
              <SVG on:click={removeMember(member.id)} />
            </div>
          </button>
        {/each}
      </div>
    </aside>

    <button class="start-btn" class:sub-out={slideOut} on:click={start}>
      START
    </button>
  {/if}

  <div bind:this={timer} class="timer" class:discussion={discussionMode}>
    <input
      type="number"
      value={minutes}
      min="0"
      max="60"
      on:change={(e) => updateTimer(e, "minutes")}
    />
    ：
    <input
      type="number"
      min="0"
      max="60"
      value={secondsString}
      on:change={(e) => updateTimer(e, "seconds")}
    />
  </div>

  {#if lucky}
    <svelte:component this={LuckyDay} />
  {/if}
</main>

<style>
  :root {
    --ocean-light: #8cb1dd;
    --ocean-dark: #4a85ca;
    --ocean-darkest: #0d1a2b;
    --gold-light: #cd7;
    --gold-dark: #606d1b;

    --btn-rdus: 10px;
    --btn-border: 1px solid var(--gold-dark);

    background-color: var(--ocean-darkest);
  }
  ::selection {
    background-color: var(--gold-dark);
    color: var(--gold-light);
  }
  main {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(60%, min-content) 1fr;
    grid-template-rows: repeat(4, min-content);
    grid-template-areas:
      "header header"
      "starters bench"
      "timer bench"
      "btn btn";
    gap: 24px;
    justify-items: end;
    align-items: center;
    align-content: center;
    overflow: hidden;
  }
  main.discussion {
    justify-items: center;
    align-items: center;
    gap: 60px;
    grid-template-columns: 1fr;
    grid-template-rows: repeat(2, min-content);
    grid-template-areas:
      "starters"
      "timer";
  }
  h1 {
    grid-area: header;
    justify-self: center;
    color: #fff;
    text-shadow: 1px 1px 3px var(--ocean-light);
  }
  .start-btn {
    grid-area: btn;
  }

  /* Starter / bench Members */
  .member {
    position: relative;
    margin: 0;
    font-weight: bold;
    border-radius: var(--btn-rdus);
    line-height: 1;
    border: var(--btn-border);
    box-shadow: 2px 1px 3px rgba(140, 176, 221, 0.3);
    transition: border-width 0.15s ease-in;
    cursor: pointer;
  }
  .member:hover,
  .member:focus {
    border-width: 3px;
  }
  :global(.member:hover svg) {
    opacity: 1;
  }
  /* Starters */
  .starters {
    grid-area: starters;
    align-self: start;
    padding: 20px 24px;
    gap: 6px;
    grid-template-columns: repeat(3, minmax(160px, max-content));
    grid-template-rows: 4rem 4rem 4rem;
    grid-auto-rows: 4rem;
    justify-items: center;
    justify-content: center;
  }
  .starters.discussion {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    border: none;
    padding: 0;
  }
  .container {
    position: relative;
    display: grid;
    align-items: center;
    border: 3px solid var(--gold-light);
    border-radius: 12px;
  }
  .description {
    position: absolute;
    top: -1.2rem;
    left: -1.4rem;
    font-size: 1rem;
    background-color: var(--ocean-darkest);
    color: #fff;
    font-weight: bold;
    padding: 0.4rem 0.7rem;
  }
  .starter {
    font-size: 1.5rem;
    padding: 16px 28px;
  }
  /* Bench */
  aside {
    grid-area: bench;
    align-self: start;
    justify-self: start;
  }
  .bench {
    margin-top: 24px;
    padding: 28px 32px;
    grid-auto-rows: 3.4rem;
    justify-items: stretch;
  }
  .bench .member {
    font-size: 1.1rem;
    padding: 13px 24px 13px 13px;
  }

  /* Timer */
  .timer {
    grid-area: timer;
    display: flex;
    align-items: center;
    font-size: 120px;
    color: var(--gold-light);
  }
  .timer.discussion {
    pointer-events: none;
  }
  input[type="number"] {
    width: 140px;
    margin: 0;
    padding: 0;
    background-color: transparent;
    border: none;
    outline: none;
    color: var(--gold-light);
  }
  input[type="number"]:first-of-type {
    text-align: right;
  }
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }

  /* Start */
  .start-btn {
    justify-self: center;
    background-color: var(--ocean-dark);
    color: #fff;
    font-size: 40px;
    /* padding: 16px 32px; */
    padding: 0;
    height: 90px;
    width: 160px;
    cursor: pointer;
    border-radius: var(--btn-rdus);
    border: 1px solid var(--gold-light);
    transition: background-color 0.35s ease-in, color 0.2s ease-in,
      border-width 0.05s ease-in;
  }
  .start-btn:hover,
  .start-btn:focus {
    background-color: var(--ocean-light);
    color: var(--ocean-darkest);
  }
  .start-btn:active {
    border-width: 4px;
  }

  .sub-out {
    animation: sub-out 0.3s 0.2s ease-in forwards;
  }

  @keyframes sub-out {
    to {
      transform: translateX(100px);
      opacity: 0;
    }
  }
</style>
