insert into public.products(id,slug,name,family,description,base_price,min_quantity,min_width,max_width,min_height,max_height,default_width,default_height,bleed_mm,resolution_dpi,configuration_schema,sort_order)
values
('11111111-1111-4111-8111-111111111111','labels','Labels & Stickers','labels','Die-cut, kiss-cut and sheeted labels for products that move.',1.80,25,20,500,20,500,100,100,3,300,'{"materials":["premium_vinyl","paper","clear_vinyl"],"orientations":["portrait","landscape"]}',1),
('22222222-2222-4222-8222-222222222222','race-numbers','Race & Event Numbers','race_numbers','Variable-data race bibs with crisp numbering and sponsor lockups.',3.20,50,100,500,100,500,210,148,3,300,'{"materials":["weatherproof_stock"],"variableData":true}',2),
('33333333-3333-4333-8333-333333333333','mtb-boards','MTB Boards','mtb_boards','Trail-tough handlebar boards shaped and drilled to format.',12.00,10,150,500,100,400,240,180,5,300,'{"materials":["polypropylene"],"drilling":true}',3),
('44444444-4444-4444-8444-444444444444','stamps','Custom Stamps','stamps','Self-inking marks for packaging, paperwork and signatures.',28.00,1,20,150,10,100,70,35,0,600,'{"inkColours":["black","blue","red","green"]}',4),
('55555555-5555-4555-8555-555555555555','trophies','Trophies & Awards','trophies','Layered, engraved awards for podiums, teams and milestones.',42.00,1,80,500,100,700,150,240,2,300,'{"materials":["acrylic","timber","layered"]}',5),
('66666666-6666-4666-8666-666666666666','laser-cut','Laser-cut Work','laser_cut','Precision-cut signage, tags and custom objects.',18.00,1,20,1000,20,1000,200,200,2,300,'{"materials":["acrylic","plywood","mdf"],"thickness":[3,6,9]}',6)
on conflict(slug) do update set name=excluded.name,description=excluded.description,configuration_schema=excluded.configuration_schema,updated_at=now();

-- After creating your administrator in Supabase Auth, promote that account with:
-- update public.profiles set role='admin' where email='studio@digitalheroes.co.in';

