import {describe,it,expect,vi} from 'vitest';
import {validateExtraction,scoreBoard,parseFitBoard,type FitBoard} from '../../core/src/lib/evidence/fit';
const base:FitBoard={requestId:'req-1',role:'Engineer',company:'Example',description:'React\nRust',requirements:[{id:'r1',text:'React',start:0,end:5},{id:'r2',text:'Rust',start:6,end:10}],evidence:[{id:'domios',project:'domios',text:'React and Rust'}],pairs:[],available:false};
const probabilities={'0':0,'1':0,'2':0,'3':0,'4':1};
describe('Fit Board evidence contract',()=>{
  it('validates exact full-JD requirement spans and stable unique IDs',()=>{
    expect(validateExtraction(base,base.description)?.requirements).toEqual(base.requirements);
    expect(validateExtraction({...base,requirements:[{...base.requirements[0],text:'COBOL'}]},base.description)).toBeNull();
    expect(validateExtraction({...base,requirements:[base.requirements[0],base.requirements[0]]},base.description)).toBeNull();
    expect(validateExtraction({...base,requirements:[{...base.requirements[0],start:-1}]},base.description)).toBeNull();
  });
  it('scores all requirement-source pairs in exactly one 1500ms call',async()=>{
    const ask=vi.fn().mockResolvedValue({available:true,answers:{r1:{type:'score',score:4,probabilities},r2:{type:'score',score:4,probabilities,confidence:0.8}}});
    const board=await scoreBoard(base,ask,'test');
    expect(ask).toHaveBeenCalledTimes(1); expect(ask.mock.calls[0][0].deadlineMs).toBe(1500);
    expect(Object.keys(ask.mock.calls[0][0].questions)).toEqual(['r1','r2']);
    expect(board.available).toBe(true);expect(board.pairs).toHaveLength(2);
    expect(board.pairs[0].confidence).toBeUndefined();expect(board.pairs[1].confidence).toBe(0.8);
    expect(board).not.toHaveProperty('matchPercent');expect(board).not.toHaveProperty('boostedPercent');
  });
  it('retains continuous scores and derives labels from the supplied distribution',async()=>{
    const distribution={'0':0,'1':0,'2':0.06,'3':0.17,'4':0.77};
    const ask=vi.fn().mockResolvedValue({available:true,answers:{r1:{type:'score',score:3.7,probabilities:distribution},r2:{type:'score',score:3.7,probabilities:distribution}}});
    const board=await scoreBoard(base,ask);
    expect(board.available).toBe(true);expect(board.pairs[0].rawScore).toBe(3.7);expect(board.pairs[0].score).toBe(3.7);expect(board.pairs[0].level).toBe(4);
  });
  it.each([
    {available:true,answers:{r1:{type:'score',score:4,probabilities}}},
    {available:true,answers:{r1:{type:'score',score:99,probabilities},r2:{type:'score',score:4,probabilities}}},
    {available:true,answers:{r1:{type:'score',score:4,probabilities:{}},r2:{type:'score',score:4,probabilities}}},
    {available:false,reason:'deadline'},
    {available:false,reason:'missing_key'},
    {available:false,reason:'credits'},
  ])('makes a whole malformed/unavailable batch unscored',async result=>{
    const ask=vi.fn().mockResolvedValue(result);const board=await scoreBoard(base,ask);
    expect(board.available).toBe(false);expect(board.pairs).toEqual([]);expect(ask).toHaveBeenCalledTimes(1);
  });
});

it('rejects stale, revised and wrong-source streamed boards before rendering bars',()=>{
 const computed={...base,available:true,pairs:[{requirementId:'r1',sourceId:'domios',score:3.7,probabilities:{'0':0,'1':0,'2':.1,'3':.1,'4':.8}},{requirementId:'r2',sourceId:'domios',score:3.7,probabilities:{'0':0,'1':0,'2':.1,'3':.1,'4':.8}}]};
 expect(parseFitBoard(computed,'req-1',base.description)).not.toBeNull();
 expect(parseFitBoard(computed,'new',base.description)).toBeNull();
 expect(parseFitBoard(computed,'req-1','revised')).toBeNull();
 expect(parseFitBoard({...computed,pairs:[{...computed.pairs[0],sourceId:'invented'},computed.pairs[1]]},'req-1',base.description)).toBeNull();
});
