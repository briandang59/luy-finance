import {emptyState,applyOperation,dayKey,monthKey,shiftMonth} from './model.js';
export function seedState(now = new Date()) {
  const at = new Date(now).toISOString(), period = monthKey(now);
  let state = emptyState(), n = 0;
  const apply = (type,payload) => {state = applyOperation(state,{id:`demo-event-${++n}`,at,type,payload});};
  apply('setup',{openingBalance:36000000,openingSavings:20000000,openingAt:dayKey(now),name:'Bạn'});
  const rows = [];
  for (let i = 5;i > 0;i--) {
    const month = shiftMonth(period,-i);
    rows.push({id:`demo-income-${i}`,period:month,day:'',type:'income',amount:16000000 + (5 - i) * 500000,category:'salary',description:'Thu nhập tháng',scope:'history',recordMode:'summary'});
    rows.push({id:`demo-expense-${i}`,period:month,day:'',type:'expense',amount:11000000 + i * 200000,category:i % 2 ? 'unclassified' : 'expense-other',description:'Chi tiêu tháng · dữ liệu chỉ có tháng/năm',scope:'history',recordMode:'summary'});
  }
  rows.push({id:'demo-salary',period,day:'',type:'income',amount:18000000,category:'salary',description:'Lương tháng này',scope:'history',recordMode:'detail'});
  for (const [id,category,amount,description] of [['food','food',3200000,'Ăn uống trong tháng'],['home','home',5000000,'Tiền nhà'],['transport','transport',1200000,'Đi lại'],['other','expense-other',2600000,'Mua sắm và sinh hoạt']]) rows.push({id:`demo-${id}`,period,day:'',type:'expense',amount,category,description,scope:'history',recordMode:'detail'});
  apply('entries.import',{entries:rows});
  apply('goal.save',{id:'demo-emergency',name:'Quỹ dự phòng',target:50000000,deadline:shiftMonth(period,5),color:'green',icon:'shield',initialAllocation:20000000,note:'Một khoảng an tâm cho những điều bất ngờ.'});
  apply('goal.save',{id:'demo-travel',name:'Một chuyến đi thật xa',target:15000000,deadline:shiftMonth(period,8),color:'orange',icon:'plane',initialAllocation:0,note:'Dành cho những trải nghiệm mới.'});
  apply('saving.move',{id:'demo-saving',kind:'deposit',amount:2000000,goalId:'demo-emergency',note:'Thêm một chút cho tương lai.'});
  return state;
}
