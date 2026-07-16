/**
 * BRouter Custom Profile Generator
 * Generates custom .brf scripts dynamically based on user preferences.
 */
export function generateBRouterProfile(options) {
  // Translate profile variables
  const isHiking = options.profile === 'foot-hiking' || options.profile === 'hiking';
  const isRoadBike = options.profile === 'cycling-road';

  // Asphalt preference translation: "no_asphalt" -> 1, "any" -> 0, "only_asphalt" -> 2
  let asphaltPref = 0;
  if (options.asphalt_preference === 'no_asphalt') asphaltPref = 1;
  else if (options.asphalt_preference === 'only_asphalt') asphaltPref = 2;

  // Cycleroute focus: "ignore" -> 0, "neutral" -> 1, "prefer" -> 2
  let cyclerouteFocus = 1;
  if (options.cycleroute_focus === 'ignore') cyclerouteFocus = 0;
  else if (options.cycleroute_focus === 'prefer') cyclerouteFocus = 2;

  // Map sliders: 5 is neutral (1.0), 1 is 0.5, 10 is 5.0 (for unpaved / path)
  const unpavedPref = parseFloat(options.unpaved_preference) || 5;
  const pathPref = parseFloat(options.path_preference) || 5;
  const cobblestonePref = parseFloat(options.cobblestone_preference) || 1;
  const sandmudPref = parseFloat(options.sandmud_preference) || 1;

  // Uphillcost / downhillcost
  const uphillCost = parseInt(options.uphillcost) || 0;
  const downhillCost = parseInt(options.downhillcost) || 0;

  // Construct a complete, valid BRouter Profile script (.brf format)
  return `---context:global
assign allow_steps = ${options.allow_steps ? 'true' : 'false'}
assign allow_ferries = ${options.allow_ferries ? 'true' : 'false'}
assign avoid_unsafe = ${options.avoid_unsafe ? 'true' : 'false'}
assign avoid_tunnel = ${options.avoid_tunnel ? 'true' : 'false'}
assign avoid_steep = ${options.avoid_steep ? 'true' : 'false'}
assign uphillcost = ${uphillCost}
assign downhillcost = ${downhillCost}

# Custom surface preference: 0=Egal, 1=Kein Asphalt, 2=Nur Asphalt
assign asphalt_preference = ${asphaltPref}
assign unpaved_preference = ${unpavedPref}
assign path_preference = ${pathPref}
assign cobblestone_preference = ${cobblestonePref}
assign sandmud_preference = ${sandmudPref}

# Cycle routes focus
assign ignore_cycleroutes = ${cyclerouteFocus === 0 ? 'true' : 'false'}
assign stick_to_cycleroutes = ${cyclerouteFocus === 2 ? 'true' : 'false'}
assign use_proposed_cycleroutes = ${options.use_proposed_cycleroutes ? 'true' : 'false'}
assign ignore_oneway = ${options.ignore_oneway ? 'true' : 'false'}

# Environmental weights
assign consider_noise = ${options.consider_noise ? 'true' : 'false'}
assign consider_river = ${options.consider_river ? 'true' : 'false'}
assign consider_forest = ${options.consider_forest ? 'true' : 'false'}
assign consider_town = ${options.consider_town ? 'true' : 'false'}
assign consider_traffic = ${options.consider_traffic ? 'true' : 'false'}

assign is_hiking = ${isHiking ? 'true' : 'false'}
assign is_road_bike = ${isRoadBike ? 'true' : 'false'}

---context:way

# Tag checks
assign steps = highway=steps
assign ferry = route=ferry
assign is_tunnel = tunnel=yes

# Surface checks
assign is_asphalt = or surface=asphalt or surface=concrete or surface=paved or surface=paving_stones or surface=sett concrete=yes
assign is_unpaved = or surface=unpaved or surface=gravel or surface=ground or surface=dirt or surface=earth or surface=grass or surface=compacted or surface=fine_gravel or surface=wood or surface=sand or surface=mud
assign is_path = or highway=path or highway=footway or highway=track or highway=cycleway or highway=bridleway

# Unsafe roads for regular cycling
assign is_unsafe = and avoid_unsafe ( or highway=primary or highway=secondary or highway=trunk )

# Base costfactor logic
assign default_cost =
  switch steps ( switch allow_steps 2.0 9999.0 )
  switch ferry ( switch allow_ferries 2.0 9999.0 )
  switch is_unsafe 10.0
  switch ( and avoid_tunnel is_tunnel ) 99.0
  switch ( and is_road_bike is_unpaved ) 15.0 # Road bike avoids unpaved heavily
  1.0

# Dynamic surface costs
assign surface_cost =
  switch is_asphalt ( switch ( equal asphalt_preference 1 ) 12.0 1.0 ) (
    switch is_unpaved ( switch ( equal asphalt_preference 2 ) 12.0 ( switch ( less unpaved_preference 5 ) 0.6 ( switch ( equal unpaved_preference 5 ) 1.0 ( multiply 0.2 unpaved_preference ) ) ) ) 1.0
  )

# Path/trail preference multiplier
assign path_cost =
  switch is_path ( switch ( less path_preference 5 ) 0.6 ( switch ( equal path_preference 5 ) 1.0 ( multiply 0.2 path_preference ) ) ) 1.0

# Additional Surface penalties
assign cobblestone_cost =
  switch surface=cobblestone|sett ( switch ( equal cobblestone_preference 1 ) 1.0 ( multiply 0.5 cobblestone_preference ) ) 1.0

assign sandmud_cost =
  switch surface=sand|mud ( switch ( equal sandmud_preference 1 ) 1.0 ( multiply 1.0 sandmud_preference ) ) 1.0

# Environmental factors
assign env_cost =
  switch ( and consider_forest or leisure=park or landuse=forest wood=yes ) 0.8
  switch ( and consider_river water=yes ) 0.8
  1.0

# Final costfactor computation
assign raw_cost = multiply default_cost ( multiply surface_cost ( multiply path_cost ( multiply cobblestone_cost ( multiply sandmud_cost env_cost ) ) ) )
assign costfactor = max 1.0 raw_cost

# Oneway handling
assign oneway =
  switch ignore_oneway 0
  oneway

---context:node
`;
}
