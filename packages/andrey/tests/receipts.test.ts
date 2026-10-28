import { describe,it,expect,vi } from 'vitest';
import { claimsIn,computeReceipts,currentReceipt,CALIBRATION } from '../../core/src/lib/evidence/receipts';
describe('computed-only receipts',()=>{
  it('extracts exact bounded Markdown offsets',()=>{
    const text='Start **Swift / iOS** then **Rust**.';
    const claims=claimsIn(text);
    expect(claims.map(c=>text.slice(c.start,c.end))).toEqual(['Swift / iOS','Rust']);
    expect(claimsIn('**fact** '.repeat(30))).toHaveLength(12);
  });
  it('leaves even high raw scores unmarked while calibration is unaccepted',async()=>{
    const ask=vi.fn();
    expect(await computeReceipts({requestId:'r1',content:'**Swift**',evidence:[],ask,policy:{...CALIBRATION,enabled:false}})).toEqual({available:false,reason:'uncalibrated',receipts:[]});
    expect(ask).not.toHaveBeenCalled();
  });
  it('marks only a high computed score with an exact source substring',async()=>{
    const ask=vi.fn().mockResolvedValue({available:true,answers:{'claim-0':{type:'noul',noul:0.95}}});
    const result=await computeReceipts({requestId:'r1',content:'**Swift**',evidence:[{id:'skills',text:'Swift: 11 years'}],ask});
    expect(result.receipts).toHaveLength(1);
    expect(currentReceipt(result.receipts[0],'r1','**Swift**')).toBe(true);
    const falseClaim=await computeReceipts({requestId:'r1',content:'**25 years of Swift**',evidence:[{id:'skills',text:'Swift: 11 years'}],ask});
    expect(falseClaim.receipts).toEqual([]);
  });
  it.each([0,0.2,0.69])('leaves low and midrange valid scores unmarked (%s)',async score=>{
    const ask=vi.fn().mockResolvedValue({available:true,answers:{'claim-0':{type:'noul',noul:score}}});
    const result=await computeReceipts({requestId:'midrange',content:'**Swift**',evidence:[{id:'skills',text:'Swift: 11 years'}],ask});
    expect(result.receipts).toEqual([]);
  });
  it('rejects stale requests, revised offsets and unversioned scores',()=>{
    const r:any={id:'claim-0',requestId:'old',start:2,end:7,text:'Swift',source:'Swift',sourceId:'skills',score:1,category:'supported',calibrationVersion:CALIBRATION.version};
    expect(currentReceipt(r,'new','**Swift**')).toBe(false);
    expect(currentReceipt(r,'old','**Rust**')).toBe(false);
    expect(currentReceipt({...r,score:NaN},'old','**Swift**')).toBe(false);
  });
});
