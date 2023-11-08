
    // @input Component.Text text_title
    // @input Component.Text text_description


//@ui {"widget":"group_start","label":"Text settings"}

    //@input vec4 text_color {"label":"Text color", "widget":"color"}
    //@input vec4 outline_color {"label":"Border color", "widget":"color"}
    //@input vec4 shadow_color {"label":"shadow color", "widget":"color"}

//@ui {"widget":"group_end"}

//@ui {"widget":"group_start","label":"Prompt settings"}

    //@input bool convert_to_uppercase = true {"label":"convert to uppercase"}
    //@input int maxIngredients = 10 {"label":"Maximum ingredients to choose from"}
    //@input float prompt_temp = 1 {"label":"Prompt Temperature"}



//@ui {"widget":"group_end"}

    /** @type {boolean} */
    var convert_to_uppercase = script.convert_to_uppercase;
    var maxIngredients = script.maxIngredients;

    /** @type {vec4} */
    var text_color = script.text_color;
    var outline_color = script.outline_color;
    var shadow_color = script.shadow_color;

    /** @type {number} */
    var textsize = script.textsize;
    var prompt_temp = script.prompt_temp;

    /** @type {Text} */
    var text_title = script.text_title;
    var text_description = script.text_description;

let seperator = '++'

/* text_title.textFill.color = text_color;
text_title.dropshadowSettings.fill.color = shadow_color;
text_title.outlineSettings.fill.color = outline_color; */

script.api.build = build

function requestGPT(req) {

    print(`Requesting answer for: ${req.messages[0].content}`);
    
    global.chatGpt.completions(req, (errorStatus, response) => {
        if (!errorStatus && typeof response === 'object') {
            const mainAnswer = response.choices[0].message.content;
            print(mainAnswer);
            fillTextFields(mainAnswer)
        } else {
            print(JSON.stringify(response));
        }
    })
}

function buildPrompt(ingredients){

    var ingredients_shuffled = shuffle(ingredients)
    var ingredients_sliced = ingredients_shuffled.slice(0,maxIngredients)
    var ingredients_stringified = ingredients_sliced.toString();

    var formatPart_0 = "Adjective" //"Humorous Expletive"
    var formatPart_1 = "Dish Type / recipe name" //recipe name
    var formatPart_2 = "Ingredient 1"
    var formatPart_3 = "Ingredient 2"
    
    var extra_0 = "randomise the order of the format."
    var extra_1 = "Keep the name of the recipe PG-13 and safe for work."
    var extra_2 = "No additional information is necessary."
    var extra_3 = "Provide the recipe name only, with no additional explanation or text."
    
    let integer = Math.round(Math.random());
    var amounts = ["two","three"]
    let amount_of_ingredients_in_name = amounts[integer]
    let specifiers = ["with a hint of","etc"].toString();
    let max_words = 18;

    let p = `Using the ingredients provided, create one humorous and catchy name for a fusion dish that exemplifies a culinary melting pot aka the ultimate combination dish. The recipe name must include three of the following ingredients: ${ingredients_stringified}. Craft the recipe name using one of the following format: '<${formatPart_0}> <${formatPart_1}> with <${formatPart_2}> and <${formatPart_3}>'. Provide the recipe name only, with no additional explanation or text. also Invent a humorous, yet grounded, single sentence backstory for the unique recipe name. Use no more than ${max_words} words for the backstory. Do not exceed this limit. The content should be imaginative but plausible, avoiding any supernatural elements. Add a geographical reference and describe the flavours. Put the following seperator inbetween the dish name and backstory: ${seperator}. Your output format will be '<dish name> <seperator> <backstory>'` 

    return p
}

function fillTextFields(str){

    var str = convert_to_uppercase ? str.toUpperCase() : str;
        
    const texts = str.split(seperator);
    text_title.text = texts[0]
    text_description.text = texts[1]
}



function build(arr){

    var names = collectNames(arr)
    var prompt = buildPrompt(names);
    
    print(`prompt : ${prompt}`)
    const request = { 
        "temperature": prompt_temp,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    };
    requestGPT(request);

}

// script.createEvent("OnStartEvent").bind(requestGPT);

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }

  function collectNames(arr) {
    const namesArray = [];
    for (const obj of arr) {
      if (obj.hasOwnProperty('name')) { // Check if 'name' key exists
        namesArray.push(obj.name); // Collect the 'name' value
      }
    }
    return namesArray;
  }


  /* const prompt_Title = `Create a witty and humorous name for a fusion recipe that reflects the eclectic blend of multiple cuisines, incorporating the 'melting pot' concept. The recipe name must humorously integrate two of the following ingredients, ensuring they are central to the dish's identity: ${ingredients_stringified}. Please craft the recipe name using one of the following formats: 1: '<${formatPart_0}>-<${formatPart_1}> with <${formatPart_2}> and <${formatPart_3}>'. ${extra_0} ${extra_1} ${extra_2}` */

/* let prompt_Title = `Create a witty and humorous name for a fusion recipe that reflects the eclectic blend of multiple cuisines, incorporating the 'melting pot' concept. The name should be unique, catchy, humurous and embody the spirit of a 'melting pot' cuisine, including an amusing blend of flavors, textures and food types. Incorporate at least ${amount_of_ingredients_in_name} of the following ingredients into the recipe name to highlight the dish's hybrid nature: ${ingredients_stringified}. Adapt the structure of the recipe name in multiple ways, with the format including variations such as '<${formatPart_0}> <${formatPart_1}> with <${formatPart_2}> and <${formatPart_3}>', '<${formatPart_1}> <${formatPart_0}> with <${formatPart_2}> and <${formatPart_3}>', or '<${formatPart_0}> <${formatPart_2}>-<${formatPart_3}> <${formatPart_1}>'. Creatively add extra specifiers like: ${specifiers}. Ensuring the output is appropriate for a general audience. ${extra_1} ${extra_2} ${extra_3}` */