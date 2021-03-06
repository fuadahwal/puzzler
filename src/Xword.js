// @flow
import React, { Component } from 'react';
import Modal from 'react-modal';
import FileInput from './FileInput.js';
import Server from './Server.js';
import {TimerState, Timer} from './Timer.js';
import { Route, Switch, Link } from 'react-router-dom';
import { DropdownButton, MenuItem, ProgressBar } from 'react-bootstrap';
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import './Xword.css';

// TODO
//  . usability
//  . styling
//   . timer
//    . center over puzzle?
//    . smaller top/bottom margins
//   . title
//   . colors
//  . polish
//   . clue resize to grid height
//   . shift-tab focus last letter
//   . scroll sideways annoying
//  . phone interface
//   . clue only entry
//  . restyle input selection
//  . solve stats (by day)
//  . creation app using same components as solver app
//  . dictionary loader
//  . javacsript filler
//  . fill statistics - scrabble score etc
//  . file drop
//  . file extension from choose file doesn't work
//  'A' => 0, 'D' => 1 constants
//  . don't take over ctrl-l
//  . border on clues
//  . initial clue selection if 0 is black
var Xd = require("./xd.js");
var Puz = require("./puz.js");
var Xpf = require("./xpf.js");

class XwordClue {
  state: {
    index: number,
    direction: string,
    number: number,
    clue: string,
    answer: string,
    active: boolean,
    crossActive: boolean
  };

  constructor(options) {
    this.state = {
      'index': 0,
      'direction': 'A',
      'number': 0,
      'clue': '',
      'answer': '',
      'active': false,
      'crossActive': false,
    };
    Object.assign(this.state, options);
  }
  setState(newstate) {
    Object.assign(this.state, newstate);
  }
  get(key) : any {
    return this.state[key];
  }
}

class XwordCell {
  state: {
    fill: string,
    entry: string,
    active: boolean,
    focus: boolean,
    circled: boolean,
    incorrect: boolean,
    number: number,
    version: number,
  };

  constructor(options) {
    this.state = {
      fill: '.',
      entry: ' ',
      active: false,
      focus: false,
      circled: false,
      incorrect: false,
      version: 0,
      number: 0,
    };
    Object.assign(this.state, options);
  }
  setState(newstate) {
    Object.assign(this.state, newstate);
  }
  get(key) : any {
    return this.state[key];
  }
  isBlack() : boolean {
    return this.state.fill === '#';
  }
}

function Title(props) {
  var title = props.title;
  var author = props.author ? " by " + props.author : "";

  return (
      <div className={"xwordjs-title"}>
        <span className={"xwordjs-title-text"}>{title}</span>
        <span className={"xwordjs-author-text"}>{author}</span>
      </div>
  );
}

function ClueBar(props) {
  var text = '';
  for (var i=0; i < props.value.length; i++) {
    var clue = props.value[i];
    if (clue.get('active')) {
      text = clue.get('number') + ". " + clue.get('clue');
    }
  }
  return <div className={"xwordjs-clue-bar"}>{text}</div>;
}

function Clue(props) {
  var clue = props.value;
  var contents = clue.get('number') + ". " + clue.get('clue');
  var extraClass = "";

  if (clue.get('active'))
    extraClass = " xwordjs-clue-active";
  else if (clue.get('crossActive'))
    extraClass = " xwordjs-clue-cross-active";

  return (
    <div className={"xwordjs-clue" + extraClass} id={"clue_" + clue.get('index')} onClick={() => props.onClick(clue)}>{contents}</div>
  );
}

function Cluelist(props) {
  var list = [];
  for (var i=0; i < props.value.length; i++) {
    var clue = props.value[i];
    list.push(<Clue key={"clue_" + i} onClick={(x) => props.selectClue(x)} value={clue}/>);
  }
  return (
    <div>
    <h3>{props.title}</h3>
    <div className="xwordjs-cluelist">
    {list}
    </div>
    </div>
  );
}

function Clues(props) {
  var across = [];
  var down = [];
  for (var i=0; i < props.value.length; i++) {
    var clue = props.value[i];

    if (clue.get('direction') === 'A') {
      across.push(props.value[i]);
    } else {
      down.push(props.value[i]);
    }
  }
  return(
    <div id="xwordjs-cluelist-container" className="xwordjs-cluelist-container">
      <Cluelist selectClue={props.selectClue} value={across} title="Across"/>
      <Cluelist selectClue={props.selectClue} value={down} title="Down"/>
    </div>
  );
}

class Grid extends Component {
  render() {
    var rows = [];
    for (var i=0; i < this.props.height; i++) {
      var row_cells = [];
      for (var j=0; j < this.props.width; j++) {
        var ind = i * this.props.width + j;
        var fill = this.props.cells[ind].get('fill');
        var entry = this.props.cells[ind].get('entry');
        var active = this.props.cells[ind].get('active');
        var focus = this.props.cells[ind].get('focus');
        var circled = this.props.cells[ind].get('circled');
        var incorrect = this.props.cells[ind].get('incorrect');
        var number = this.props.cells[ind].get('number') || '';
        var black = fill === '#';

        if (fill === '#' || fill === '.') {
          fill = ' ';
        }
        var cell = <Cell id={"cell_" + ind} value={entry} key={"cell_" + ind}
         isBlack={black} isActive={active} isFocus={focus}
         isCircled={circled}
         isIncorrect={incorrect}
         isTop={i===0} isLeft={j===0} number={number}
         onClick={(x)=>this.props.handleClick(parseInt(x.substring(5), 10))}/>;
        row_cells.push(cell);
      }
      rows[i] = <div className="xwordjs-grid-row" key={"row_" + i}>{row_cells}</div>;
    }
    return (
      <div id="xwordjs-grid-inner">{rows}</div>
    );
  }
}

function MobileKeyboardKey(props) {
  return <div className="xwordjs-keyboard-key" onClick={() => props.onClick(props.code)}>{props.value}</div>;
}

function MobileKeyboard(props) {
  var keys = ["qwertyuiop", "asdfghjkl", "␣zxcvbnm⌫"];
  var rows = [];
  for (var i=0; i < keys.length; i++) {
    var rowstr = keys[i];
    var row_keys = [];
    for (var j=0; j < rowstr.length; j++) {
      var ch = rowstr.charAt(j);
      var code;
      if (ch === '␣') {
        code = 0x20;
      } else if (ch === '⌫') {
        code = 0x8;
      } else {
        code = ch.charCodeAt(0);
      }
      var key = <MobileKeyboardKey key={ch} onClick={props.onClick} code={code} value={ch}/>;
      row_keys.push(key);
    }
    rows[i] = <div className="xwordjs-keyboard-row" key={i}>{row_keys}</div>;
  }
  return (
    <div className="xwordjs-keyboard">{rows}</div>
  );
}

function Cell(props) {
  var classname="xwordjs-cell";
  if (props.isBlack) {
    classname += " xwordjs-cell-black";
  }
  if (props.isTop) {
    classname += " xwordjs-cell-top";
  }
  if (props.isLeft) {
    classname += " xwordjs-cell-left";
  }
  if (props.isFocus) {
    classname += " xwordjs-cell-focus";
    if (props.isIncorrect)
      classname += "-incorrect";
  } else if (props.isActive) {
    classname += " xwordjs-cell-active";
    if (props.isIncorrect)
      classname += "-incorrect";
  }

  if (props.isIncorrect)
    classname += " xwordjs-cell-incorrect";

  var circleclass = "";
  if (props.isCircled) {
    circleclass = "xwordjs-cell-circled";
  }

  return <div className={classname} onClick={() => props.onClick(props.id)}>
            <div className={circleclass}>
              <div className="xwordjs-cell-number">{props.number}</div>
              <div className="xwordjs-cell-text">{props.value}</div>
            </div>
          </div>;
}

class XwordSolver extends Component {

  state: {
    height: number,
    width: number,
    cells: Array<XwordCell>,
    clues: Array<XwordClue>,
    title: string,
    author: string,
    timer: TimerState,
    activecell: number,
    direction: string,
    cell_to_clue_table: Array<Array<number>>,
    clue_to_cell_table: Array<number>,
    version: number,
    solutionId: ?string,
    dismissed_modal: boolean,
    modified: boolean,
    server: ?Server
  };
  closeModal: Function;
  revealAll: Function;
  serverUpdate: Function;

  constructor() {
    super();
    this.state = {
      'height': 15,
      'width': 15,
      'cells': [],
      'clues': [],
      'title': '',
      'author': '',
      'timer': new TimerState(),
      'activecell': 0,
      'direction': 'A',
      'cell_to_clue_table': [],
      'clue_to_cell_table': [],
      'dismissed_modal': false,
      'version': 1,
      'modified': false,
      'solutionId': null,
      'server': null,
    }
    this.closeModal = this.closeModal.bind(this);
    this.revealAll = this.revealAll.bind(this);
    this.serverUpdate = this.serverUpdate.bind(this);
  }
  loadServerPuzzle(id: string) {
    if (!process.env.REACT_APP_HAS_SERVER)
      return;

    var self = this;
    var server = new Server({base_url: process.env.PUBLIC_URL})
    server
      .getSolution(id)
      .then(function(obj) {
        return server.getPuzzle(obj.PuzzleId)
      })
      .then(function(data) {
        var decoder = new TextDecoder('utf-8');
        var puz = new Xpf(decoder.decode(data));
        self.setState({solutionId: id, server: server});
        self.puzzleLoaded(id, puz);
        server.connect(id, self.serverUpdate);
        var entries = [];
        for (var i=0; i < self.state.cells.length; i++) {
          entries.push({'Version': -1, 'Value': ''});
        }
        server.sendSolution(id, -1, entries);
      });
  }
  loadPuzzle(file: File, filename : ?string) {
    var self = this;
    if (process.env.REACT_APP_HAS_SERVER) {
      var server = new Server({base_url: process.env.PUBLIC_URL})
      server.uploadPuzzle(file)
        .then(function(obj) {
          var id = obj.Id;
          return server.startSolution(id);
        })
        .then(function(obj) {
          var solutionId = obj.Id;
          document.location.hash = "/s/" + solutionId;
          self.loadServerPuzzle(solutionId);
        });
    } else {
      this.loadPuzzleURL(window.URL.createObjectURL(file), filename);
    }
  }
  loadPuzzleURL(url: string, filename : ?string) {
    var self = this;
    var request = new Request(url);
    fetch(request).then(function(response) {
      return response.arrayBuffer();
    }).then(function(data) {
      var puz;
      var fn = filename || url;
      var decoder;
      if (fn.endsWith("xd")) {
        decoder = new TextDecoder('utf-8');

        puz = new Xd(decoder.decode(data));
        self.puzzleLoaded(url, puz);
      } else if (fn.endsWith("xml") || url.match(/^http/)) {
        decoder = new TextDecoder('utf-8');

        puz = new Xpf(decoder.decode(data));
        self.puzzleLoaded(url, puz);
      } else {
        puz = new Puz(data);
        self.puzzleLoaded(url, puz);
      }
    });
  }
  cellPos(clue_id: number) {
    var y = Math.floor(clue_id / this.state.width);
    var x = clue_id % this.state.width;
    return [x, y];
  }
  navRight() {
    var [x, y] = this.cellPos(this.state.activecell);
    while (x < this.state.width) {
      x += 1;
      if (x < this.state.width &&
          this.state.cells[y * this.state.width + x].get('fill') !== '#')
        break;
    }
    if (x === this.state.width)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navLeft() {
    var [x, y] = this.cellPos(this.state.activecell);
    while (x >= 0) {
      x -= 1;
      if (x >= 0 &&
          this.state.cells[y * this.state.width + x].get('fill') !== '#')
        break;
    }
    if (x < 0)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navUp() {
    var [x, y] = this.cellPos(this.state.activecell);
    while (y >= 0) {
      y -= 1;
      if (y >= 0 &&
          this.state.cells[y * this.state.width + x].get('fill') !== '#')
        break;
    }
    if (y < 0)
      return;
    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navDown() {
    var [x, y] = this.cellPos(this.state.activecell);
    while (y < this.state.height) {
      y += 1;
      if (y < this.state.height &&
          this.state.cells[y * this.state.width + x].get('fill') !== '#')
        break;
    }
    if (y === this.state.height)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navNextClue() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
    var clue_id = this.state.cell_to_clue_table[cur_cell_id][dind];
    var next_clue_id = (clue_id + 1) % this.state.clues.length;
    this.selectClue(this.state.clues[next_clue_id]);
  }
  navPrevClue() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
    var clue_id = this.state.cell_to_clue_table[cur_cell_id][dind];
    var next_clue_id = (clue_id - 1) % this.state.clues.length;
    this.selectClue(this.state.clues[next_clue_id]);
  }
  navNext() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
    var clue_id = this.state.cell_to_clue_table[cur_cell_id][dind];
    var start_cell_id = this.state.clue_to_cell_table[clue_id];
    var clue = this.state.clues[clue_id];

    var [x, y] = this.cellPos(cur_cell_id);
    var [start_x, start_y] = this.cellPos(start_cell_id);
    var alen = clue.get('answer').length;

    for (var i = 0; i < alen; i++) {
      if (this.state.direction === 'A')
        x += 1;
      else
        y += 1;
      if (x >= start_x + alen)
        x = start_x;
      if (y >= start_y + alen)
        y = start_y;

      var cell = this.state.cells[y * this.state.width + x];
      if (cell.get('entry') === ' ')
        break;
    }
    if (i === alen) {

      [x, y] = this.cellPos(cur_cell_id);


      if ((this.state.direction === 'A' && x === start_x + alen - 1) ||
          (this.state.direction === 'D' && y === start_y + alen - 1)) {
        this.navNextClue();
        return;
      }

      if (this.state.direction === 'A')
        x += 1;
      else
        y += 1;
    }
    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navPrev() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
    var clue_id = this.state.cell_to_clue_table[cur_cell_id][dind];
    var start_cell_id = this.state.clue_to_cell_table[clue_id];

    var [x, y] = this.cellPos(cur_cell_id);
    var [start_x, start_y] = this.cellPos(start_cell_id);

    if (this.state.direction === 'A')
      x -= 1;
    else
      y -= 1;
    if (x < start_x)
      x = start_x;
    if (y < start_y)
      y = start_y;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  switchDir() {
    var dir = this.state.direction === 'A' ? 'D' : 'A';
    this.selectCell(this.state.activecell, dir);
  }
  type(ch: string) {
    var cell = this.state.cells[this.state.activecell];

    cell.setState({'entry': ch, 'version': cell.get('version') + 1});
    this.setState({modified: true})
    this.navNext();
  }
  del() {
    var cell = this.state.cells[this.state.activecell];

    cell.setState({'entry': ' ', 'version': cell.get('version') + 1});
    this.setState({modified: true})
    this.selectCell(this.state.activecell, this.state.direction);
  }
  backspace() {
    var cell = this.state.cells[this.state.activecell];
    cell.setState({'entry': ' ', 'version': cell.get('version') + 1});
    this.setState({modified: true})
    this.navPrev();
  }
  isCorrect() {
    for (var i=0; i < this.state.cells.length; i++) {
      var cell = this.state.cells[i];
      var fill = cell.get('fill');
      var entry = cell.get('entry');

      if (fill !== '#' && entry !== fill)
        return false;
    }
    return true;
  }
  processKeyCode(keyCode: number, shift: boolean)
  {

    if ((keyCode >= 0x41 && keyCode <= 0x5a) ||
        (keyCode >= 0x61 && keyCode <= 0x7a)) {
      var ch = String.fromCharCode(keyCode)
      this.type(ch.toUpperCase());
      return true;
    }

    switch (keyCode) {
      case 0x8:
        this.backspace();
        return true;
      case 0x9:
        if (!shift)
          this.navNextClue();
        else
          this.navPrevClue();
        return true;
      case 0x20:
        this.switchDir();
        return true;
      case 0x25:
        this.navLeft();
        return true;
      case 0x26:
        this.navUp();
        return true;
      case 0x27:
        this.navRight();
        return true;
      case 0x28:
        this.navDown();
        return true;
      case 0x2e:
        this.del();
        return true;
      default:
        return false;
    }
  }
  handleKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.altKey)
      return;

    if (this.state.direction === 'A' && (e.keyCode === 0x26 || e.keyCode === 0x28)) {
      this.selectCell(this.state.activecell, 'D');
      e.preventDefault();
      return;
    }
    if (this.state.direction === 'D' && (e.keyCode === 0x25 || e.keyCode === 0x27)) {
      this.selectCell(this.state.activecell, 'A');
      e.preventDefault();
      return;
    }
    if (this.processKeyCode(e.keyCode, e.shiftKey)) {
      e.preventDefault();
    }
  }
  handleClick(i: number) {
    if (this.state.activecell === i) {
      this.switchDir();
    } else {
      this.selectCell(i, this.state.direction);
    }
  }
  puzzleLoaded(url: string, puz: Object) {
    var grid = puz.grid;
    var flags = puz.flags;
    var maxx = grid[0].length;
    var maxy = grid.length;
    var i;
    var title = 'Untitled';
    var author = 'Unknown';

    for (i=0; i < puz.headers.length; i++) {
      var [header, value] = puz.headers[i];
      if (header === 'Title') {
        title = value;
      } else if (header === 'Creator' || header === 'Author') {
        author = value;
      }
    }

    var cells = Array(maxx * maxy).fill(null);
    var cell_to_clue_table = Array(maxx * maxy).fill(null);

    var number_index = [];
    for (var y = 0; y < maxy; y++) {
      for (var x = 0; x < maxx; x++) {
        var fill = grid[y][x];
        var is_black = fill === '#';
        var number = 0;
        var start_of_xslot = (!is_black &&
                              (x === 0 || grid[y][x-1] === '#') &&
                              (x + 1 < maxx && grid[y][x+1] !== '#'));
        var start_of_yslot = (!is_black &&
                              (y === 0 || grid[y-1][x] === '#') &&
                              (y + 1 < maxy && grid[y+1][x] !== '#'));

        if (start_of_xslot || start_of_yslot) {
          number_index.push([x,y]);
          number = number_index.length;
        }
        var circled = false;
        if (flags) {
          circled = !!(flags[y][x] & puz.FLAGS.CIRCLED);
        }
        cells[y * maxx + x] = new XwordCell({
          'fill': fill,
          'number': number,
          'active': false,
          'circled': circled
        });
        cell_to_clue_table[y * maxx + x] = [null, null];
      }
    }

    var clues = [];
    var clue_to_cell_table = [];

    for (i=0; i < puz.clues.length; i++) {
      var [type, cluestr, answer] = puz.clues[i];
      var [dir, num] = type;
      var clue = new XwordClue({
        'index': i, 'direction': dir, 'number': num, 'clue': cluestr,
        'answer': answer});
      clues.push(clue);


      // cell id
      var xy = number_index[num - 1];
      clue_to_cell_table[i] = xy[1] * maxx + xy[0];


      var ind = 0, xincr = 0, yincr = 0;
      if (dir === 'A') {
        xincr = 1;
      } else {
        ind = 1; yincr = 1;
      }
      [x, y] = xy;
      for (var j = 0; y < maxy && x < maxx; j++) {
        var cell = y * maxx + x;
        if (grid[cell] === '#')
          break;
        cell_to_clue_table[cell][ind] = i;
        x += xincr; y += yincr;
      }
    }
    this.setState({
      'title': title, 'author': author,
      'width': maxx, 'height': maxy, 'cells': cells, 'clues': clues,
      'clue_to_cell_table': clue_to_cell_table,
      'cell_to_clue_table': cell_to_clue_table
    });
    this.loadStoredData();
    this.selectCell(0, 'A', true);


    var gridelem = document.getElementById("xwordjs-grid-inner");
    var cluediv = document.getElementById("xwordjs-cluelist-container");
    var cluelist = document.getElementsByClassName("xwordjs-cluelist");
    var gridHeight = window.getComputedStyle(gridelem).getPropertyValue("height");

    if (cluediv)
      cluediv.style.height = gridHeight;

    for (i = 0; i < cluelist.length; i++) {
        var e = cluelist[i];
        var newheight = String(parseInt(gridHeight, 10) - 60) + "px";
        e.style.height = newheight;
    }
  }
  saveStoredData()
  {
    var key = this.state.cells.map((x) => x.state.fill).join("");
    var data = {
      entries: this.state.cells.map((x) => x.state.entry),
      elapsed: this.state.timer.get('elapsed')
    };

    if (!data.elapsed)
      return;
    localStorage.setItem(key, JSON.stringify(data));
  }
  readStoredData()
  {
    var key = this.state.cells.map((x) => x.state.fill).join("");
    var data = localStorage.getItem(key);
    if (!data)
      return null;

    return JSON.parse(data);
  }
  loadStoredData()
  {
    var data = this.readStoredData()
    if (!data)
      return;

    var entries = data.entries;
    var elapsed = data.elapsed;
    for (var i=0; i < entries.length; i++) {
      this.state.cells[i].setState({entry: entries[i]});
    }
    this.setState({modified: true})
    this.state.timer.setState({elapsed: elapsed});
    this.setState({cells: this.state.cells, timer: this.state.timer});
  }
  highlightClue(clue: XwordClue, active: boolean)
  {
    var cluenum = clue.get('index');
    var cind = this.state.clue_to_cell_table[cluenum];
    var [x, y] = this.cellPos(cind);

    var x_incr = clue.get('direction') === 'A' ? 1 : 0;
    var y_incr = !x_incr;

    for (; x < this.state.width && y < this.state.height; ) {
      var cell = this.state.cells[this.state.width * y + x];
      if (cell.isBlack())
        break;

      cell.setState({"active": active});
      x += x_incr;
      y += y_incr;
    }
  }
  selectCell(cell_id: number, direction: string, initial: ?boolean)
  {
    var cell = this.state.cells[cell_id];

    if (cell.isBlack())
      return;

    var newclues = this.state.clues.slice();
    var newcells = this.state.cells.slice();


    var oldcell_id = this.state.activecell;
    var old_dind = (this.state.direction === 'A') ? 0 : 1;
    var oldclue = this.state.clues[this.state.cell_to_clue_table[oldcell_id][old_dind]];
    var oldcross = this.state.clues[this.state.cell_to_clue_table[oldcell_id][1 - old_dind]];
    var oldcell = this.state.cells[oldcell_id];

    var dind = (direction === 'A') ? 0 : 1;
    var clue = this.state.clues[this.state.cell_to_clue_table[cell_id][dind]];
    var cross = this.state.clues[this.state.cell_to_clue_table[cell_id][1 - dind]];

    var e;

    if (initial || oldcross !== cross) {
      if (oldcross)
        oldcross.setState({"crossActive": false});
      if (cross) {
        cross.setState({"crossActive": true});
        e = document.getElementById("clue_" + cross.get('index'));
        if (e)
          scrollIntoViewIfNeeded(e);
      }
    }

    if (initial || oldclue !== clue) {

      if (oldclue) {
        oldclue.setState({"active": false});
        this.highlightClue(oldclue, false);
      }
      if (clue) {
        clue.setState({"active": true});
        this.highlightClue(clue, true);
        e = document.getElementById("clue_" + clue.get('index'));
        if (e)
          scrollIntoViewIfNeeded(e);
      }
    }

    if (initial || oldcell_id !== cell_id) {
      oldcell.setState({focus: false});
      cell.setState({focus: true});
    }
    this.setState({'clues': newclues, 'cells': newcells, 'activecell': cell_id, 'direction': direction});
  }
  revealCell()
  {
    var cell = this.state.cells[this.state.activecell];
    cell.setState({'entry': cell.get('fill')});
    this.setState({'cells': this.state.cells.slice()});
  }
  revealClue()
  {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
    var clue_id = this.state.cell_to_clue_table[cur_cell_id][dind];

    var cind = this.state.clue_to_cell_table[clue_id];
    var [x, y] = this.cellPos(cind);

    var x_incr = !dind;
    var y_incr = !x_incr;

    for (; x < this.state.width && y < this.state.height; ) {
      var cell = this.state.cells[this.state.width * y + x];
      if (cell.isBlack())
        break;

      cell.setState({"entry": cell.get('fill')});
      x += x_incr;
      y += y_incr;
    }

    var cell = this.state.cells[this.state.activecell];
    cell.setState({'entry': cell.get('fill')});
    this.setState({'cells': this.state.cells.slice()});
  }
  selectClue(clue: XwordClue)
  {
    var cluenum = clue.get('index');

    // set first cell in this clue as active
    var cell = this.state.clue_to_cell_table[cluenum];
    this.selectCell(cell, clue.get('direction'));
  }
  closeModal() {
    this.setState({'dismissed_modal': true});
  }
  showErrors() {
    for (var i=0; i < this.state.cells.length; i++) {
      var cell = this.state.cells[i];
      if (!cell.isBlack()) {
        if (cell.get('entry') != ' ' &&
            cell.get('entry') !== cell.get('fill')) {
          cell.setState({incorrect: true});
        }
      }
    }
    var newcells = this.state.cells.slice();
    this.setState({'cells': newcells});
  }
  revealAll() {
    this.setState({'dismissed_modal': true});
    for (var i=0; i < this.state.cells.length; i++) {
      var cell = this.state.cells[i];
      if (!cell.isBlack())
        cell.setState({'entry': cell.get('fill')});
    }
    var newcells = this.state.cells.slice();
    this.setState({'cells': newcells});
  }
  serverUpdate(json: Object) {
    console.log("a server update happened...");
    for (var i = 0; i < json.Entries.length; i++) {
      var ch = json.Entries[i].Value;
      var version = json.Entries[i].Version;

      var cell = this.state.cells[i];
      if (cell && !cell.isBlack() && version > cell.get('version')) {
        cell.setState({entry: ch, version: version});
      }
    }
    this.setState({version: json.Version});
  }
  updateTimer(state: Object) {
    if (state.stopped)
      return;

    if (this.isCorrect()) {
      state.stopped = true;
    }
    this.saveStoredData();
    this.state.timer.setState(state);
    this.setState({'timer': this.state.timer});

    if (!this.state.solutionId)
      return;

    var entries = [];
    for (var i=0; i < this.state.cells.length; i++) {
      var cell = this.state.cells[i];
      entries.push({'Version': cell.get('version'), 'Value': cell.get('entry')});
    }
    if (this.state.modified) {

      this.state.server.sendSolution(this.state.solutionId,
                                     this.state.version, entries);
      this.setState({modified: false});
    }
  }
  componentDidMount() {
    var self = this;
    window.addEventListener("keydown", (e) => self.handleKeyDown(e));
    if (this.props.filename) {
      self.loadPuzzleURL(process.env.PUBLIC_URL + this.props.filename);
      return;
    }
    if (this.props.serverId) {
      self.loadServerPuzzle(this.props.serverId);
      return;
    }



    var puzzle = window.location.hash.substring(1);
    if (puzzle.length && puzzle[0] !== '/' && this.props.history) {
      this.props.history.push("/s/" + puzzle);
      return;
    }

    puzzle = window.location.search.substring(1);
    if (puzzle.length && this.props.history) {
      this.props.history.push("/file/" + puzzle);
      return;
    }
  }
  componentWillUnmount() {
    var self = this;
    window.removeEventListener("keydown", (e) => self.handleKeyDown(e));
  }
  render() {
    if (this.state.cells.length === 0) {
      if (this.props.filename || this.props.serverId) {
        return (<span>{"Loading..."}</span>);
      }
      if (process.env.REACT_APP_HAS_SERVER) {
         return (
           <div className="XwordMain">
             <div className="xwordjs-text-box">
             <h1>Collaborative XwordJS</h1>

             <p>
             Upload a crossword puzzle here (.puz or .xpf format).
             Once loaded, you can copy the random URL string and share with
             someone else to play together.
             </p>

             <FileInput onChange={(x, filename) => this.loadPuzzle(x, filename)} />
             </div>
           </div>
         );
      }
      return (
        <div className="XwordMain">
          <div className="xwordjs-text-box">
          <h1>XwordJS</h1>

          <p>
          Select a crossword puzzle here (.puz or .xpf format) and then
          you can solve it in your browser.  The file will remain local
          and not uploaded anywhere else.
          </p>

          <FileInput onChange={(x, filename) => this.loadPuzzle(x, filename)} />
          </div>
        </div>
      );
    }
    return (
      <div className="XwordMain">
        <Modal isOpen={this.isCorrect() && !this.state.dismissed_modal}>
          <h1>Nice job!</h1>
          <p>You solved it.  Sorry for the anticlimactic dialog.</p>
          <p>It took {this.state.timer.elapsedStr(true)}.</p>
          <button onClick={this.closeModal}>OK</button>
        </Modal>
        <div className="xwordjs-vertical-container">
          <div className="xwordjs-topbar">
            <Title title={this.state.title} author={this.state.author}/>
          </div>
          <div className="xwordjs-timer-bar">
            <Timer value={this.state.timer} onChange={(x) => this.updateTimer(x)}/>
            <DropdownButton title="Reveal">
              <MenuItem eventKey="1" onClick={() => this.showErrors()}>Show Errors</MenuItem>
              <MenuItem divider/>
              <MenuItem eventKey="2" onClick={() => this.revealCell()}>Reveal Cell</MenuItem>
              <MenuItem eventKey="3" onClick={() => this.revealClue()}>Reveal Clue</MenuItem>
              <MenuItem divider/>
              <MenuItem eventKey="4" onClick={() => this.revealAll()}>Reveal All</MenuItem>
            </DropdownButton>
          </div>
          <ClueBar value={this.state.clues}/>
          <div className="xwordjs-container">
            <div className="xwordjs-grid">
              <Grid height={this.state.height} width={this.state.width} cells={this.state.cells} handleClick={(x) => this.handleClick(x)}/>
            </div>
            <Clues selectClue={(i) => this.selectClue(i)} value={this.state.clues}/>
          </div>
          <MobileKeyboard onClick={(code) => this.processKeyCode(code, false)}/>
        </div>
      </div>
    );
  }
}

function XwordLoadFile(props) {
  return (
    <XwordSolver filename={props.match.params.name}/>
  );
}

function XwordLoadServer(props) {
  return (
    <XwordSolver serverId={props.match.params.hash}/>
  );
}

class XwordPuzzleListLoader extends Component
{
  state: {
    items: ?array
  };

  constructor(options) {
    super();
    this.state = {
      items: null
    }
    Object.assign(this.state, options);
  };

  componentDidMount()
  {
    var self = this;
    var server = new Server({base_url: process.env.PUBLIC_URL})
    server.listSolutions().then(function (data) {
      self.setState({items: data});
    });
  }
  render() {
    if (!this.state.items) {
      return <b>Loading...</b>;
    }
    return <XwordPuzzleList puzzles={this.state.items}/>;
  }
}

function XwordPuzzleList(props) {
  var items = [];
  for (var i = 0; i < props.puzzles.length; i++) {
    var p = props.puzzles[i];
    items.push(<li key={i}><Link to={"/s/" + p.Id}>{p.Title + " " + p.Author}<ProgressBar now={p.Progress} label={`${p.Progress}%`}/></Link></li>);
  }
  return <ul>{items}</ul>;
}

function XwordMainPanel() {
  return (
    <Switch>
      <Route exact path="/" component={XwordSolver}/>
      <Route path="/file/:name" component={XwordLoadFile}/>
      <Route path="/s/:hash" component={XwordLoadServer}/>
      <Route path="/list" component={XwordPuzzleListLoader}/>
    </Switch>
  );
}

function XwordMain() {
  return (
    <div>
      <XwordMainPanel />
    </div>
  );
}


export default XwordMain;
