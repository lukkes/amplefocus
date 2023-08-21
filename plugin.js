const plugin = {
  workDuration: 30 * 60 * 1000, // ms
  breakDuration: 10 * 60 * 1000, // ms
  updateInterval: 10 * 1000, // ms

  initialQuestions: [
    "What am I trying to accomplish?",
    "Why is this important and valuable?",
    "How will I know this is complete?",
    "Potential distractions? How am I going to deal with them?",
    "Is this concrete/measurable or subjective/ambiguous?",
    "Anything else noteworthy?",
  ],
  cycleStartQuestions: [
    "What am I trying to accomplish this cycle?",
    "How will I get started?",
    "Any hazards? How will I counter them?",
  ],
  cycleEndQuestions: [
    "Any distractions?",
    "Anything noteworthy?",
    "Things to improve next cycle?",
  ],
    
  insertText: {
    "Focus": async function(app) {
      try {
        await this._focus(app);
      } catch (err) {
        console.log(err);
        app.alert(err);
      }
    },
  },

  async _focusTest(app) {
    const now = new Date();
    await this._insertLog(app, now, 2);
    await this._startFocusTimer(app, now, 2);
  },

  async _focus(app) {
    console.log("Starting Amplefocus...");
    const [startTime, cycleCount] = await this._promptInput(app);
    const initialQuestions = await this._promptInitialQuestions(app);
    await this._insertLog(app, startTime, cycleCount, initialQuestions);
    await this._startFocusTimer(app, startTime, cycleCount);
    const focusNote = await this._getFocusNote(app);
    await app.navigate(
      `https://www.amplenote.com/notes/${ focusNote.uuid }`
    );
  },

  async _promptInput(app) {
    const startTime = await this._promptStartTime(app);
    if (!startTime) { return; }
    const cycleCount = await this._promptCycleCount(app, startTime);
    if (!cycleCount) { return; }
    return [new Date(Number(startTime)), cycleCount];
  },

  async _promptStartTime(app) {
    const startTimeOptions = this._generateStartTimeOptions();
    const result = await app.prompt("Focus Cycle Configuration", {
      inputs: [
        {
          label: "Start Time",
          type: "select",
          options: startTimeOptions
        }
      ]
    });
    return result;
  },

  async _promptCycleCount(app, startTimeValue) {
    const startTime = new Date(Number(startTimeValue));
    console.log("Start time selected:", this._formatAsTime(startTime));
  
    const cycleOptions = this._generateCycleOptions(startTime);
    const cycleResult = await app.prompt("Focus Cycle Configuration", {
      inputs: [
        {
          label: "Number of Cycles",
          type: "select",
          options: cycleOptions
        }
      ]
    });
    return cycleResult;
  },

  async _promptInitialQuestions(app) {
    const initialQuestions = await app.prompt("Initial Questions", {
      inputs: this.initialQuestions.map(function(question) {
        return {
          label: question,
          type: "text",
        };
      })
    });
    console.log(initialQuestions);
    return initialQuestions;
  },

  async _insertLog(app, startTime, cycleCount, initialQuestions) {
    const focusNote = await this._getFocusNote(app);
    const focusNoteLink = this._formatNoteLink(focusNote.name, focusNote.uuid);
    const timestamp = new Date().toLocaleTimeString(
      undefined,
      { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
    );
    const sessionMarkdown = [
      `- **[${timestamp}]** ${focusNoteLink} for ${cycleCount} cycles`,
    ];

    console.log(this.initialQuestions);
    for (let i = 0; i < this.initialQuestions.length; i++) {
      sessionMarkdown.push(
        `  - **${this.initialQuestions[i]}**`,
      );
      let answer = initialQuestions[i];
      sessionMarkdown.push(`    - ${answer}`);
    }

    await this._appendToNote(app, sessionMarkdown.join("\n"));
  },

  async _appendToNote(app, contents, targetNoteUUID=null) {
    if (!targetNoteUUID) { targetNoteUUID = app.context.noteUUID; }
    await app.insertNoteContent({uuid: targetNoteUUID}, contents, {atEnd: true});
  },
  
  _formatNoteLink(name, uuid) {
    return `[${name}](https://www.amplenote.com/notes/${uuid})`;
  },

  _formatAsTime(date) {
    const options = { hour: '2-digit', minute: '2-digit', hour12: false };
    const timeString = date.toLocaleTimeString(undefined, options);
    return timeString;
  },

  async _getFocusNote(app) {
    const focusNotes = await app.filterNotes({ tag: "focus" });
    let focusNote;
  
    if (focusNotes.length > 0) {
      focusNote = focusNotes[0];
    } else {
      let focusNoteUUID = await app.createNote("Focus", ["focus"]);
      focusNote = await app.findNote(focusNoteUUID);
    }
  
    return focusNote;
  },

  _generateStartTimeOptions() {
    console.log("Generating start time options...");
    const options = [];
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
  
    for (let offset = -20; offset <= 20; offset += 5) {
      const time = new Date(now.getTime() + offset * 60 * 1000);
      const label = this._formatAsTime(time);
      const value = time.getTime();
      options.push({ label, value });
    }
  
    console.log("Start time options generated.");
    return options;
  },

  _generateCycleOptions(startTime) {
    console.log("Generating cycle options...");
    const options = [];
  
    for (let cycles = 2; cycles <= 8; cycles++) {
      const endTime = this._calculateEndTime(startTime, cycles);
      const label = `${cycles} cycles (until ${this._formatAsTime(endTime)})`;
      options.push({ label, value: cycles });
    }
  
    console.log("Cycle options generated.");
    return options;
  },
  
  _calculateEndTime(startTime, cycles) {
    console.log("Calculating end time for given start time and cycles...");
    const totalTime = (this.workDuration + this.breakDuration) * cycles;
    const endTime = new Date(startTime.getTime() + totalTime);
  
    console.log("Start time:", (new Date(startTime)));
    console.log("Cycles:", cycles);
    console.log("End time calculated:", this._formatAsTime(endTime));
    return endTime;
  },
  
  async _startFocusTimer(app, startTime, cycles) {
    console.log("Starting focus cycle...");
    const focusNote = await this._getFocusNote(app);
  
    for (let i = 0; i < cycles; i++) {
      const workEndTime = new Date(startTime.getTime() + this.workDuration);
      const breakEndTime = new Date(workEndTime.getTime() + this.breakDuration);
  
      await this._handleWorkPhase(app, focusNote, workEndTime, i);
      await this._handleBreakPhase(app, focusNote, workEndTime, breakEndTime, i, cycles);
  
      startTime = breakEndTime;
    }
  },
  
  async _handleWorkPhase(app, focusNote, workEndTime, cycleIndex) {
    console.log(`Cycle ${cycleIndex + 1}: Starting work phase...`);
  
    const workInterval = setInterval(() => {
      this._logRemainingTime(app, focusNote, workEndTime, "work", cycleIndex);
    }, this.updateInterval);
  
    await this._sleepUntil(workEndTime);
    clearInterval(workInterval);
    app.alert(`Cycle ${cycleIndex + 1}: Work phase completed. Take a break!`);
  },
  
  async _handleBreakPhase(app, focusNote, workEndTime, breakEndTime, cycleIndex, cycles) {
    await this._appendToNote(app, `- Cycle ${cycleIndex + 1} debrief:`);
  
    if (cycleIndex < cycles - 1) {
      await this._appendToNote(app, `- Cycle ${cycleIndex + 2} plan:`);
      console.log(`Cycle ${cycleIndex + 1}: Starting break phase...`);
  
      const breakInterval = setInterval(() => {
        this._logRemainingTime(app, focusNote, breakEndTime, "break", cycleIndex);
      }, this.updateInterval);
  
      await this._sleepUntil(breakEndTime);
      clearInterval(breakInterval);
      app.alert(`Cycle ${cycleIndex + 1}: Break phase completed. Start working!`);
      console.log(`Cycle ${cycleIndex + 1}: Break phase completed.`);
    } else {
      await this._appendToNote(app, `- Session debrief:`);
      console.log(`Session complete.`);
      app.alert(`Session complete. Debrief and relax.`);
    }
  },
  
  _logRemainingTime(app, focusNote, endTime, phase, cycleIndex) {
    const remainingTime = endTime.getTime() - Date.now();
    if (remainingTime > 0) {
      const remainingMinutes = Math.ceil(remainingTime / 1000 / 60);
      // const progressBar = this._generateProgressBar(remainingTime, phase);
      const phaseDuration = phase === 'work' ? this.workDuration : this.breakDuration;
      const progressBar = this._emojiProgressBar(phaseDuration, phaseDuration - remainingTime);
      const message = `- Cycle ${cycleIndex + 1} ${phase} phase remaining time: ${remainingMinutes} minutes\n${progressBar}\n`;
      app.replaceNoteContent(focusNote, message);
    }
  },

  _emojiProgressBar(total, done, width=320, range=["🌑", "🌒", "🌓", "🌔", "🌕"]) {
    const n = Math.floor(width / 25);
    const l = total;
    const step = l / n;
  
    const emoji = (portion) => {
      const domain = [0, 1];
      const quantizedPortion = (portion - domain[0]) / (domain[1] - domain[0]) * (range.length - 1);
      const index = Math.floor(quantizedPortion);
      return range[index];
    };
  
    const phases = Array.from(new Array(n), (d, i) => {
      const portion = (done % step) / step;
      return done / step >= (i + 1)
        ? range[range.length - 1]
        : done / step < i
        ? range[0]
        : emoji(portion);
    });

    return phases.join(" ");
  },
    
  async _sleepUntil(endTime) {
    const sleepTime = endTime.getTime() - Date.now();
    await this._sleep(sleepTime);
  },

  _sleep(ms) {
    return new Promise((resolve) => {
      if (ms > 0) {
        setTimeout(resolve, ms);
      } else {
        resolve();
      }
    });
  },
};
