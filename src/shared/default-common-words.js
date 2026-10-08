// Common words seed list — verbatim from the retired PhonicsConstructor.js COMMON_WORDS.
// Used as the is_common fallback when no base dictionary is loaded.
// No YAML, no compiler, no validation rules apply to this list.
export const DEFAULT_COMMON_WORDS = new Set((
  'the be to of and a in that have i it for not on with he as you do at this but his by from ' +
  'they we say her she or an will my one all would there their what so up out if about who get which ' +
  'go me when make can like time no just him know take people into year your good some could them see ' +
  'other than then now look only come its over think also back after use two how our work first well ' +
  'way even new want because any these give day most us is are was were has had does did would should ' +
  'may might must shall went gone coming saw seen looked looking said saying made making took taken got ' +
  'gotten gave given found put run ran running cat dog sun hat bat rat mat sat fat pat man can fan pan ' +
  'ran van bag tag rag big dig pig wig fig log fog hog jog bog bug hug mug rug tug dug bed fed led red ' +
  'wed ten hen pen den men net pet set wet let met bet bit fit hit sit lit pit kit win pin fin tin bin ' +
  'din sin chin thin shin ship shop chip chop chat that this them when whip fish wish dish cash mash ' +
  'dash ash bash gash hash lash rash sash trash flash crash smash shell smell spell swell class grass ' +
  'glass pass mass less mess dress press stress trip trap tree train truck trick track crack black ' +
  'block clock click clack brick bring brush brave broke bright splash spring sprint string strong ' +
  'street stream stamp stump stand still small smile stone store story storm start jump hand lamp ' +
  'milk soft belt help plant ant tent sink night light right might tight fight queen quick quit quilt'
).split(/\s+/).filter(Boolean));
